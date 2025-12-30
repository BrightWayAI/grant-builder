/**
 * Ambiguity Detector
 * 
 * Detects ambiguous, contradictory, or unclear instructions in RFP text.
 * Flags issues that require user clarification before generation can proceed.
 */

import prisma from '@/lib/db';
import { getOpenAI } from '@/lib/ai/openai';
import {
  AmbiguityType,
  AmbiguityFlag,
  AmbiguitySummary
} from '@/types/enforcement';
import { generateId } from '@/lib/utils';

export class AmbiguityDetector {
  /**
   * Analyze RFP text for ambiguities and persist flags
   */
  async analyzeAndPersist(
    proposalId: string,
    rfpText: string
  ): Promise<AmbiguitySummary> {
    const ambiguities = await this.detectAmbiguities(rfpText, proposalId);
    
    // Clear existing ambiguities for this proposal
    await prisma.ambiguityFlagRecord.deleteMany({
      where: { proposalId }
    });

    // Persist new ambiguities
    for (const ambiguity of ambiguities) {
      await prisma.ambiguityFlagRecord.create({
        data: {
          proposalId,
          ambiguityType: ambiguity.type,
          description: ambiguity.description,
          sourceTexts: ambiguity.sourceTexts,
          suggestedResolutions: ambiguity.suggestedResolutions,
          requiresUserInput: ambiguity.requiresUserInput,
          resolved: false
        }
      });
    }

    return this.buildSummary(proposalId, ambiguities);
  }

  /**
   * Detect ambiguities in RFP text
   */
  async detectAmbiguities(rfpText: string, proposalId: string): Promise<AmbiguityFlag[]> {
    const ambiguities: AmbiguityFlag[] = [];

    // 1. Deterministic checks
    const deterministicAmbiguities = this.detectDeterministic(rfpText, proposalId);
    ambiguities.push(...deterministicAmbiguities);

    // 2. LLM-based detection for more nuanced issues
    try {
      const llmAmbiguities = await this.detectWithLLM(rfpText, proposalId);
      
      // De-duplicate based on description similarity
      const existingDescriptions = new Set(ambiguities.map(a => a.description.toLowerCase()));
      for (const amb of llmAmbiguities) {
        if (!existingDescriptions.has(amb.description.toLowerCase())) {
          ambiguities.push(amb);
        }
      }
    } catch (error) {
      console.error('LLM ambiguity detection failed:', error);
      // Continue with deterministic results
    }

    return ambiguities;
  }

  /**
   * Deterministic ambiguity detection
   */
  private detectDeterministic(rfpText: string, proposalId: string): AmbiguityFlag[] {
    const ambiguities: AmbiguityFlag[] = [];
    const textLower = rfpText.toLowerCase();

    // Check for contradictory terms
    const contradictions = [
      { terms: ['brief', 'comprehensive'], type: 'CONTRADICTORY' as AmbiguityType },
      { terms: ['concise', 'thorough'], type: 'CONTRADICTORY' as AmbiguityType },
      { terms: ['short', 'detailed'], type: 'CONTRADICTORY' as AmbiguityType },
      { terms: ['summary', 'comprehensive overview'], type: 'CONTRADICTORY' as AmbiguityType },
    ];

    for (const { terms, type } of contradictions) {
      const found = terms.filter(t => textLower.includes(t));
      if (found.length > 1) {
        ambiguities.push({
          id: generateId(),
          proposalId,
          type,
          description: `Potentially contradictory requirements: "${found.join('" and "')}"`,
          sourceTexts: found.map(t => this.findContextForTerm(rfpText, t)),
          suggestedResolutions: [
            'Prioritize being comprehensive while maintaining clarity',
            'Focus on key points with supporting detail',
            'Contact funder for clarification'
          ],
          requiresUserInput: true,
          resolved: false
        });
      }
    }

    // Check for vague requirements
    const vaguePatterns = [
      { pattern: /\b(adequate|appropriate|sufficient)\s+(budget|staffing|resources)/gi, type: 'VAGUE' as AmbiguityType },
      { pattern: /\b(reasonable|modest)\s+(amount|funding|request)/gi, type: 'VAGUE' as AmbiguityType },
      { pattern: /\bas\s+needed\b/gi, type: 'VAGUE' as AmbiguityType },
    ];

    for (const { pattern, type } of vaguePatterns) {
      const matches = rfpText.match(pattern);
      if (matches) {
        for (const match of matches) {
          ambiguities.push({
            id: generateId(),
            proposalId,
            type,
            description: `Vague requirement: "${match}" - no specific criteria provided`,
            sourceTexts: [this.findContextForTerm(rfpText, match)],
            suggestedResolutions: [
              'Use industry standards or funder\'s typical awards as reference',
              'Be specific and justify your approach',
              'Contact funder for clarification'
            ],
            requiresUserInput: false,
            resolved: false
          });
        }
      }
    }

    // Check for conflicting page/word limits
    const pageLimit = rfpText.match(/(\d+)\s*(?:page|pg)s?\s*(?:maximum|max|limit)?/gi);
    const wordLimit = rfpText.match(/(\d+)\s*(?:word)s?\s*(?:maximum|max|limit)?/gi);
    
    if (pageLimit && wordLimit) {
      // Rough check: 1 page ≈ 250-500 words
      const pages = parseInt(pageLimit[0].match(/\d+/)?.[0] || '0');
      const words = parseInt(wordLimit[0].match(/\d+/)?.[0] || '0');
      
      if (pages > 0 && words > 0) {
        const wordsPerPage = words / pages;
        if (wordsPerPage < 200 || wordsPerPage > 600) {
          ambiguities.push({
            id: generateId(),
            proposalId,
            type: 'SCOPE_UNCLEAR',
            description: `Page limit (${pages}) and word limit (${words}) may be inconsistent`,
            sourceTexts: [pageLimit[0], wordLimit[0]],
            suggestedResolutions: [
              'Prioritize word limit as it\'s more precise',
              'Assume standard formatting (250-300 words per page)',
              'Contact funder to confirm which limit takes precedence'
            ],
            requiresUserInput: true,
            resolved: false
          });
        }
      }
    }

    return ambiguities;
  }

  /**
   * LLM-based ambiguity detection
   */
  private async detectWithLLM(rfpText: string, proposalId: string): Promise<AmbiguityFlag[]> {
    const openai = getOpenAI();
    
    // Truncate if too long
    const truncatedText = rfpText.slice(0, 8000);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: `Analyze this RFP for ambiguous or unclear instructions.

Look for:
1. CONTRADICTORY: Requirements that conflict with each other
2. VAGUE: Requirements without specific criteria or metrics
3. IMPLICIT: Important requirements implied but not stated explicitly
4. SCOPE_UNCLEAR: Requirements where the scope or boundaries are ambiguous

Return JSON:
{
  "ambiguities": [
    {
      "type": "CONTRADICTORY" | "VAGUE" | "IMPLICIT" | "SCOPE_UNCLEAR",
      "description": "Clear description of the ambiguity",
      "sourceTexts": ["relevant quote 1", "relevant quote 2"],
      "suggestedResolutions": ["option 1", "option 2"],
      "requiresUserInput": true/false
    }
  ]
}

Only flag issues that would genuinely cause confusion when writing a proposal.
Set requiresUserInput=true only for critical issues that significantly impact the proposal.
Return empty array if no significant ambiguities found.`
      }, {
        role: 'user',
        content: truncatedText
      }],
      response_format: { type: 'json_object' },
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return [];
    }

    const parsed = JSON.parse(content);
    
    return (parsed.ambiguities || []).map((a: any) => ({
      id: generateId(),
      proposalId,
      type: a.type as AmbiguityType,
      description: a.description,
      sourceTexts: a.sourceTexts || [],
      suggestedResolutions: a.suggestedResolutions || [],
      requiresUserInput: a.requiresUserInput ?? false,
      resolved: false
    }));
  }

  /**
   * Find context around a term in the text
   */
  private findContextForTerm(text: string, term: string): string {
    const idx = text.toLowerCase().indexOf(term.toLowerCase());
    if (idx < 0) return term;
    
    const start = Math.max(0, text.lastIndexOf('.', idx - 1) + 1);
    const end = text.indexOf('.', idx);
    return text.slice(start, end >= 0 ? end + 1 : text.length).trim();
  }

  /**
   * Get ambiguity summary for a proposal
   */
  async getAmbiguitySummary(proposalId: string): Promise<AmbiguitySummary> {
    const records = await prisma.ambiguityFlagRecord.findMany({
      where: { proposalId }
    });

    const ambiguities: AmbiguityFlag[] = records.map(r => ({
      id: r.id,
      proposalId: r.proposalId,
      type: r.ambiguityType as AmbiguityType,
      description: r.description,
      sourceTexts: r.sourceTexts,
      suggestedResolutions: r.suggestedResolutions,
      requiresUserInput: r.requiresUserInput,
      resolved: r.resolved,
      resolution: r.resolution || undefined,
      resolvedBy: r.resolvedBy || undefined,
      resolvedAt: r.resolvedAt || undefined
    }));

    return this.buildSummary(proposalId, ambiguities);
  }

  /**
   * Resolve an ambiguity
   */
  async resolveAmbiguity(
    ambiguityId: string,
    resolution: string,
    userId: string
  ): Promise<void> {
    await prisma.ambiguityFlagRecord.update({
      where: { id: ambiguityId },
      data: {
        resolved: true,
        resolution,
        resolvedBy: userId,
        resolvedAt: new Date()
      }
    });
  }

  /**
   * Get unresolved ambiguities that require user input
   */
  async getBlockingAmbiguities(proposalId: string): Promise<AmbiguityFlag[]> {
    const records = await prisma.ambiguityFlagRecord.findMany({
      where: {
        proposalId,
        requiresUserInput: true,
        resolved: false
      }
    });

    return records.map(r => ({
      id: r.id,
      proposalId: r.proposalId,
      type: r.ambiguityType as AmbiguityType,
      description: r.description,
      sourceTexts: r.sourceTexts,
      suggestedResolutions: r.suggestedResolutions,
      requiresUserInput: r.requiresUserInput,
      resolved: r.resolved
    }));
  }

  /**
   * Build summary from ambiguity list
   */
  private buildSummary(proposalId: string, ambiguities: AmbiguityFlag[]): AmbiguitySummary {
    const unresolved = ambiguities.filter(a => !a.resolved).length;
    const requiresInput = ambiguities.filter(a => a.requiresUserInput && !a.resolved).length;

    return {
      proposalId,
      total: ambiguities.length,
      unresolved,
      requiresInput,
      ambiguities
    };
  }
}

// Singleton instance
export const ambiguityDetector = new AmbiguityDetector();
