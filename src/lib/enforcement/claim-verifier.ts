/**
 * Claim Extractor + Verifier
 * 
 * Extracts factual claims from generated content and verifies them
 * against the organization's knowledge base.
 * 
 * MVP approach:
 * 1. Use regex for deterministic extraction of numbers, currency, percentages, dates
 * 2. Use LLM for extraction of organizations and outcome claims
 * 3. Search KB for each claim and determine verification status
 */

import prisma from '@/lib/db';
import { getOpenAI } from '@/lib/ai/openai';
import { generateEmbedding } from '@/lib/ai/openai';
import { queryVectors } from '@/lib/ai/pinecone';
import {
  ClaimType,
  ClaimRiskLevel,
  ClaimStatus,
  ExtractedClaim,
  VerifiedClaim,
  ClaimEvidence,
  ClaimVerificationSummary
} from '@/types/enforcement';
import { 
  CLAIM_RISK_MATRIX, 
  CLAIM_PATTERNS,
  getClaimRiskLevel 
} from './claim-risk';
import { ENFORCEMENT_THRESHOLDS } from './thresholds';
import { generateId } from '@/lib/utils';

export class ClaimVerifier {
  /**
   * Extract and verify claims for a proposal
   * Persists results to database
   */
  async extractAndVerifyProposal(
    proposalId: string,
    organizationId: string
  ): Promise<ClaimVerificationSummary> {
    const paragraphs = await prisma.attributedParagraph.findMany({
      where: {
        section: {
          proposalId
        }
      },
      include: {
        section: true
      }
    });

    if (paragraphs.length === 0) {
      return this.emptySummary(proposalId);
    }

    const allClaims: VerifiedClaim[] = [];

    for (const paragraph of paragraphs) {
      // Extract claims from paragraph text
      const extracted = await this.extractClaims(paragraph.text, paragraph.id);
      
      // Verify each claim
      const verified: VerifiedClaim[] = [];
      for (const claim of extracted) {
        const evidence = await this.findEvidence(claim, organizationId);
        const status = this.determineStatus(evidence);
        
        verified.push({
          ...claim,
          status,
          evidence,
          verificationScore: evidence.length > 0 ? evidence[0].confidence : 0
        });
      }

      // Persist to database
      await this.persistClaims(paragraph.id, verified);
      allClaims.push(...verified);
    }

    return this.buildSummary(proposalId, allClaims);
  }

  /**
   * Extract claims from text
   */
  async extractClaims(text: string, paragraphId: string): Promise<ExtractedClaim[]> {
    const claims: ExtractedClaim[] = [];

    // 1. Deterministic extraction with regex
    const regexClaims = this.extractWithRegex(text, paragraphId);
    claims.push(...regexClaims);

    // 2. LLM extraction for organizations and outcomes
    try {
      const llmClaims = await this.extractWithLLM(text, paragraphId);
      // De-duplicate (prefer regex matches)
      const existingValues = new Set(claims.map(c => c.value.toLowerCase()));
      for (const claim of llmClaims) {
        if (!existingValues.has(claim.value.toLowerCase())) {
          claims.push(claim);
        }
      }
    } catch (error) {
      console.error('LLM claim extraction failed:', error);
      // Continue with regex claims only
    }

    return claims;
  }

  /**
   * Extract claims using regex patterns
   */
  private extractWithRegex(text: string, paragraphId: string): ExtractedClaim[] {
    const claims: ExtractedClaim[] = [];

    // Percentage claims
    let match;
    const percentRegex = new RegExp(CLAIM_PATTERNS.PERCENTAGE.source, 'g');
    while ((match = percentRegex.exec(text)) !== null) {
      claims.push({
        id: generateId(),
        paragraphId,
        type: 'PERCENTAGE',
        value: match[0],
        context: this.getContext(text, match.index),
        position: { start: match.index, end: match.index + match[0].length },
        riskLevel: getClaimRiskLevel('PERCENTAGE')
      });
    }

    // Currency claims
    const currencyRegex = new RegExp(CLAIM_PATTERNS.CURRENCY.source, 'gi');
    while ((match = currencyRegex.exec(text)) !== null) {
      claims.push({
        id: generateId(),
        paragraphId,
        type: 'CURRENCY',
        value: match[0],
        context: this.getContext(text, match.index),
        position: { start: match.index, end: match.index + match[0].length },
        riskLevel: getClaimRiskLevel('CURRENCY')
      });
    }

    // Number claims (with context)
    const numberRegex = new RegExp(CLAIM_PATTERNS.NUMBER.source, 'gi');
    while ((match = numberRegex.exec(text)) !== null) {
      claims.push({
        id: generateId(),
        paragraphId,
        type: 'NUMBER',
        value: match[0],
        context: this.getContext(text, match.index),
        position: { start: match.index, end: match.index + match[0].length },
        riskLevel: getClaimRiskLevel('NUMBER')
      });
    }

    // Date claims
    const dateRegex = new RegExp(CLAIM_PATTERNS.DATE.source, 'gi');
    while ((match = dateRegex.exec(text)) !== null) {
      claims.push({
        id: generateId(),
        paragraphId,
        type: 'DATE',
        value: match[0],
        context: this.getContext(text, match.index),
        position: { start: match.index, end: match.index + match[0].length },
        riskLevel: getClaimRiskLevel('DATE')
      });
    }

    return claims;
  }

  /**
   * Extract organizations and outcome claims using LLM
   */
  private async extractWithLLM(text: string, paragraphId: string): Promise<ExtractedClaim[]> {
    const openai = getOpenAI();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: `Extract organization names and outcome claims from grant proposal text.
        
Return JSON:
{
  "claims": [
    {
      "type": "ORGANIZATION" | "OUTCOME",
      "value": "exact text of the claim",
      "context": "surrounding sentence"
    }
  ]
}

ORGANIZATION: Named entities like "YMCA", "United Way", "Ford Foundation", etc.
Only include explicit partner/funder names, not the applicant organization.

OUTCOME: Claims about results, achievements, or impact.
Examples: "achieved 90% employment", "reduced recidivism by 30%", "demonstrated success"

Only extract claims that could be fabricated and would need verification.
Return empty array if no such claims found.`
      }, {
        role: 'user',
        content: text
      }],
      response_format: { type: 'json_object' },
      temperature: 0
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return [];
    }

    const parsed = JSON.parse(content);
    const claims: ExtractedClaim[] = [];

    for (const c of (parsed.claims || [])) {
      const type = c.type as ClaimType;
      if (type !== 'ORGANIZATION' && type !== 'OUTCOME') continue;
      
      const idx = text.indexOf(c.value);
      claims.push({
        id: generateId(),
        paragraphId,
        type,
        value: c.value,
        context: c.context || this.getContext(text, idx >= 0 ? idx : 0),
        position: { 
          start: idx >= 0 ? idx : 0, 
          end: idx >= 0 ? idx + c.value.length : c.value.length 
        },
        riskLevel: getClaimRiskLevel(type)
      });
    }

    return claims;
  }

  /**
   * Find evidence for a claim in the knowledge base
   */
  private async findEvidence(
    claim: ExtractedClaim,
    organizationId: string
  ): Promise<ClaimEvidence[]> {
    // Build search query from claim context
    const searchQuery = `${claim.type}: ${claim.value} ${claim.context}`;
    
    try {
      const embedding = await generateEmbedding(searchQuery);
      const results = await queryVectors(embedding, organizationId, 5);

      const evidence: ClaimEvidence[] = [];
      
      for (const result of results) {
        const metadata = result.metadata as any;
        const chunkText = metadata?.content || '';
        
        // Check if the chunk contains evidence for this claim
        const confidence = this.calculateEvidenceConfidence(claim, chunkText, result.score || 0);
        
        if (confidence >= 0.3) { // Minimum threshold for evidence
          evidence.push({
            chunkId: result.id,
            documentId: metadata?.documentId || '',
            documentName: metadata?.filename || 'Unknown',
            matchedText: this.findMatchingText(claim.value, chunkText),
            confidence
          });
        }
      }

      // Sort by confidence
      evidence.sort((a, b) => b.confidence - a.confidence);
      return evidence.slice(0, 3); // Top 3 evidence items
    } catch (error) {
      console.error('Evidence search failed:', error);
      return [];
    }
  }

  /**
   * Calculate confidence that chunk provides evidence for claim
   */
  private calculateEvidenceConfidence(
    claim: ExtractedClaim,
    chunkText: string,
    vectorScore: number
  ): number {
    const chunkLower = chunkText.toLowerCase();
    const valueLower = claim.value.toLowerCase();
    
    // Direct match is highest confidence
    if (chunkLower.includes(valueLower)) {
      return Math.min(1, vectorScore + 0.3);
    }

    // For numbers, check if similar numbers exist
    if (claim.type === 'NUMBER' || claim.type === 'PERCENTAGE' || claim.type === 'CURRENCY') {
      const numericValue = this.extractNumericValue(claim.value);
      if (numericValue) {
        const numbersInChunk = chunkText.match(/\d[\d,.]*/g) || [];
        for (const num of numbersInChunk) {
          const chunkNum = this.extractNumericValue(num);
          if (chunkNum && Math.abs(chunkNum - numericValue) / numericValue < 0.1) {
            // Within 10% - likely the same stat
            return Math.min(1, vectorScore + 0.2);
          }
        }
      }
    }

    // For organizations, check for partial name matches
    if (claim.type === 'ORGANIZATION') {
      const words = valueLower.split(/\s+/);
      const matchedWords = words.filter(w => w.length > 2 && chunkLower.includes(w));
      if (matchedWords.length >= Math.ceil(words.length / 2)) {
        return Math.min(1, vectorScore + 0.1);
      }
    }

    // Base confidence is vector similarity
    return vectorScore * 0.5;
  }

  /**
   * Extract numeric value from string
   */
  private extractNumericValue(str: string): number | null {
    const cleaned = str.replace(/[$,%]/g, '').replace(/,/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  /**
   * Find matching text in chunk for a claim value
   */
  private findMatchingText(value: string, chunkText: string): string {
    const idx = chunkText.toLowerCase().indexOf(value.toLowerCase());
    if (idx >= 0) {
      const start = Math.max(0, idx - 30);
      const end = Math.min(chunkText.length, idx + value.length + 30);
      return '...' + chunkText.slice(start, end) + '...';
    }
    // Return first 100 chars if no match
    return chunkText.slice(0, 100) + '...';
  }

  /**
   * Determine claim status based on evidence
   */
  private determineStatus(evidence: ClaimEvidence[]): ClaimStatus {
    if (evidence.length === 0) {
      return 'UNVERIFIED';
    }

    const bestEvidence = evidence[0];
    
    if (bestEvidence.confidence >= ENFORCEMENT_THRESHOLDS.CLAIM_VERIFY_THRESHOLD) {
      // Check if evidence is outdated (would need document date info)
      // For MVP, assume not outdated if verified
      return 'VERIFIED';
    }

    // Check for conflicting evidence (simplified - just check if multiple docs)
    if (evidence.length > 1) {
      const docIds = new Set(evidence.map(e => e.documentId));
      if (docIds.size > 1 && bestEvidence.confidence < 0.5) {
        return 'CONFLICTING';
      }
    }

    return 'UNVERIFIED';
  }

  /**
   * Get surrounding context for a claim
   */
  private getContext(text: string, position: number): string {
    const start = Math.max(0, text.lastIndexOf('.', position - 1) + 1);
    const end = text.indexOf('.', position);
    return text.slice(start, end >= 0 ? end + 1 : text.length).trim();
  }

  /**
   * Persist verified claims to database
   */
  private async persistClaims(paragraphId: string, claims: VerifiedClaim[]): Promise<void> {
    // Delete existing claims for this paragraph
    await prisma.verifiedClaim.deleteMany({
      where: { paragraphId }
    });

    // Create new claims
    for (const claim of claims) {
      await prisma.verifiedClaim.create({
        data: {
          paragraphId,
          claimType: claim.type,
          value: claim.value,
          context: claim.context,
          positionStart: claim.position.start,
          positionEnd: claim.position.end,
          riskLevel: claim.riskLevel,
          status: claim.status,
          verificationScore: claim.verificationScore,
          evidence: JSON.parse(JSON.stringify(claim.evidence))
        }
      });
    }
  }

  /**
   * Get claim verification summary for a proposal from database
   */
  async getVerificationSummary(proposalId: string): Promise<ClaimVerificationSummary | null> {
    const claims = await prisma.verifiedClaim.findMany({
      where: {
        paragraph: {
          section: {
            proposalId
          }
        }
      }
    });

    if (claims.length === 0) {
      return null;
    }

    return this.buildSummary(proposalId, claims.map(c => ({
      id: c.id,
      paragraphId: c.paragraphId,
      type: c.claimType as ClaimType,
      value: c.value,
      context: c.context,
      position: { start: c.positionStart, end: c.positionEnd },
      riskLevel: c.riskLevel as ClaimRiskLevel,
      status: c.status as ClaimStatus,
      evidence: (c.evidence as unknown) as ClaimEvidence[],
      verificationScore: c.verificationScore
    })));
  }

  /**
   * Build summary from claims
   */
  private buildSummary(proposalId: string, claims: VerifiedClaim[]): ClaimVerificationSummary {
    const verified = claims.filter(c => c.status === 'VERIFIED').length;
    const unverified = claims.filter(c => c.status === 'UNVERIFIED').length;
    const highRiskUnverified = claims.filter(
      c => c.riskLevel === 'HIGH' && c.status === 'UNVERIFIED'
    ).length;
    const conflicting = claims.filter(c => c.status === 'CONFLICTING').length;
    const outdated = claims.filter(c => c.status === 'OUTDATED').length;

    return {
      proposalId,
      totalClaims: claims.length,
      verified,
      unverified,
      highRiskUnverified,
      conflicting,
      outdated,
      verificationRate: claims.length > 0 ? Math.round((verified / claims.length) * 100) : 0,
      claims
    };
  }

  /**
   * Return empty summary
   */
  private emptySummary(proposalId: string): ClaimVerificationSummary {
    return {
      proposalId,
      totalClaims: 0,
      verified: 0,
      unverified: 0,
      highRiskUnverified: 0,
      conflicting: 0,
      outdated: 0,
      verificationRate: 0,
      claims: []
    };
  }
}

// Singleton instance
export const claimVerifier = new ClaimVerifier();
