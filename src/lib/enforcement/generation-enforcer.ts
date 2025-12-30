/**
 * Generation-Time Enforcement Module
 * 
 * Implements hard, deterministic enforcement BEFORE content is shown to users.
 * Addresses: AC-1.1, AC-1.2, AC-4.2, AC-4.4, AC-5.1
 * 
 * Key behaviors:
 * 1. Pre-generation: Check KB retrieval, refuse/placeholder if empty
 * 2. Post-generation: Replace unverified claims with placeholders
 * 3. Paragraph gating: Replace ungrounded paragraphs with placeholders
 * 4. Policy lockdown: Cannot be bypassed by customInstructions
 */

import { RetrievedChunk } from '@/lib/ai/retrieval';
import prisma from '@/lib/db';

// Minimum similarity threshold for a chunk to be considered "relevant"
const MIN_CHUNK_SIMILARITY = 0.65;

// Minimum chunks required to generate confident content
const MIN_CHUNKS_FOR_GENERATION = 1;

// Similarity threshold for grounded paragraphs
const GROUNDED_THRESHOLD = 0.70;
const PARTIAL_THRESHOLD = 0.50;

// Regex patterns for high-risk claims
const CLAIM_PATTERNS = {
  NUMBER: /\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:people|participants|youth|students|families|seniors|clients|members|individuals|organizations|partners|communities|staff|volunteers|employees|beneficiaries)\b/gi,
  PERCENTAGE: /\b(\d+(?:\.\d+)?)\s*%|percent\b/gi,
  CURRENCY: /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:million|billion|thousand|M|B|K)?|\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*dollars?\b/gi,
  DATE: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,?\s+\d{4})?|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b(?:19|20)\d{2}\b/gi,
  NAMED_ORG: /\b(?:partnered?\s+with|collaboration\s+with|working\s+with|funded\s+by|supported\s+by)\s+([A-Z][A-Za-z\s&,]+?)(?:\.|,|\s+to\s|\s+for\s|\s+in\s)/gi,
};

export interface EnforcementResult {
  success: boolean;
  enforcedContent: string;
  rawContent: string;
  metadata: GenerationEnforcementMetadata;
  paragraphs: EnforcedParagraph[];
  replacedClaims: ReplacedClaim[];
}

export interface GenerationEnforcementMetadata {
  retrievedChunkCount: number;
  usedGenericKnowledge: boolean;
  minChunkSimilarity: number | null;
  maxChunkSimilarity: number | null;
  avgChunkSimilarity: number | null;
  enforcementApplied: boolean;
  claimsReplaced: number;
  paragraphsPlaceholdered: number;
  policyOverride: boolean;
}

export interface EnforcedParagraph {
  index: number;
  originalText: string;
  enforcedText: string;
  status: 'GROUNDED' | 'PARTIAL' | 'UNGROUNDED' | 'PLACEHOLDER';
  bestSimilarity: number;
  supportingChunks: Array<{
    content: string;
    similarity: number;
    documentId: string;
    filename: string;
  }>;
}

export interface ReplacedClaim {
  id: string;
  type: string;
  originalText: string;
  context: string;
  positionStart: number;
  positionEnd: number;
  reason: string;
}

/**
 * Pre-generation check: Validate that KB has sufficient content
 * Returns null if generation should proceed, or a placeholder-only response if not
 */
export function checkRetrievalSufficiency(
  chunks: RetrievedChunk[]
): { proceed: boolean; reason?: string; metadata: Partial<GenerationEnforcementMetadata> } {
  const relevantChunks = chunks.filter(c => c.score >= MIN_CHUNK_SIMILARITY);
  
  const scores = chunks.map(c => c.score);
  const minSimilarity = scores.length > 0 ? Math.min(...scores) : null;
  const maxSimilarity = scores.length > 0 ? Math.max(...scores) : null;
  const avgSimilarity = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  
  const metadata: Partial<GenerationEnforcementMetadata> = {
    retrievedChunkCount: relevantChunks.length,
    usedGenericKnowledge: relevantChunks.length < MIN_CHUNKS_FOR_GENERATION,
    minChunkSimilarity: minSimilarity,
    maxChunkSimilarity: maxSimilarity,
    avgChunkSimilarity: avgSimilarity,
  };
  
  if (relevantChunks.length < MIN_CHUNKS_FOR_GENERATION) {
    return {
      proceed: false,
      reason: `No supporting sources found in knowledge base (${chunks.length} chunks retrieved, ${relevantChunks.length} above threshold ${MIN_CHUNK_SIMILARITY})`,
      metadata,
    };
  }
  
  return { proceed: true, metadata };
}

/**
 * Generate placeholder-only content when KB is empty (AC-1.2, AC-4.4)
 */
export function generatePlaceholderOnlyContent(sectionName: string, description?: string): string {
  const placeholderId = `gen_${Date.now()}`;
  return `[[PLACEHOLDER:MISSING_DATA:No supporting sources found for "${sectionName}". Please upload relevant documents to your knowledge base or provide this content manually.:${placeholderId}]]

${description ? `Section requirement: ${description}\n\n` : ''}[[PLACEHOLDER:USER_INPUT_REQUIRED:Draft content for ${sectionName} based on your organization's actual data:${placeholderId}_content]]`;
}

/**
 * Extract high-risk claims from text
 */
export function extractClaims(text: string): Array<{
  type: string;
  value: string;
  context: string;
  start: number;
  end: number;
}> {
  const claims: Array<{
    type: string;
    value: string;
    context: string;
    start: number;
    end: number;
  }> = [];
  
  for (const [claimType, pattern] of Object.entries(CLAIM_PATTERNS)) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    
    while ((match = regex.exec(text)) !== null) {
      const contextStart = Math.max(0, match.index - 50);
      const contextEnd = Math.min(text.length, match.index + match[0].length + 50);
      
      claims.push({
        type: claimType,
        value: match[0],
        context: text.slice(contextStart, contextEnd),
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }
  
  return claims.sort((a, b) => b.start - a.start); // Sort descending for safe replacement
}

/**
 * Check if a claim is supported by retrieved chunks
 */
function isClaimSupported(claim: { value: string; context: string }, chunks: RetrievedChunk[]): boolean {
  const normalizedClaim = claim.value.toLowerCase().replace(/[,\s]+/g, '');
  
  for (const chunk of chunks) {
    const normalizedChunk = chunk.content.toLowerCase().replace(/[,\s]+/g, '');
    
    // Exact or near-exact match
    if (normalizedChunk.includes(normalizedClaim)) {
      return true;
    }
    
    // For numbers, check if the number appears in the chunk
    const numberMatch = claim.value.match(/\d[\d,.]*/);
    if (numberMatch) {
      const number = numberMatch[0].replace(/,/g, '');
      if (normalizedChunk.includes(number)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Replace unverified claims with placeholders (AC-1.3, AC-4.2)
 */
export function enforceClaimVerification(
  text: string,
  chunks: RetrievedChunk[]
): { enforcedText: string; replacedClaims: ReplacedClaim[] } {
  const claims = extractClaims(text);
  const replacedClaims: ReplacedClaim[] = [];
  let enforcedText = text;
  
  for (const claim of claims) {
    if (!isClaimSupported(claim, chunks)) {
      const claimId = `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const placeholder = `[[PLACEHOLDER:VERIFICATION_NEEDED:Unverified ${claim.type.toLowerCase()} removed - please verify: "${claim.value}":${claimId}]]`;
      
      enforcedText = enforcedText.slice(0, claim.start) + placeholder + enforcedText.slice(claim.end);
      
      replacedClaims.push({
        id: claimId,
        type: claim.type,
        originalText: claim.value,
        context: claim.context,
        positionStart: claim.start,
        positionEnd: claim.end,
        reason: 'Not found in knowledge base',
      });
    }
  }
  
  return { enforcedText, replacedClaims };
}

/**
 * Calculate text similarity using Jaccard index (fast, deterministic)
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set(Array.from(words1).filter(w => words2.has(w)));
  const union = new Set([...Array.from(words1), ...Array.from(words2)]);
  
  return intersection.size / union.size;
}

/**
 * Enforce paragraph-level grounding (AC-1.1)
 */
export function enforceParagraphGrounding(
  text: string,
  chunks: RetrievedChunk[]
): EnforcedParagraph[] {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  const results: EnforcedParagraph[] = [];
  
  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i].trim();
    
    // Skip if already a placeholder
    if (para.match(/\[\[PLACEHOLDER:/)) {
      results.push({
        index: i,
        originalText: para,
        enforcedText: para,
        status: 'PLACEHOLDER',
        bestSimilarity: 0,
        supportingChunks: [],
      });
      continue;
    }
    
    // Find best matching chunks
    const chunkScores = chunks.map(chunk => ({
      chunk,
      similarity: calculateSimilarity(para, chunk.content),
    })).sort((a, b) => b.similarity - a.similarity);
    
    const bestSimilarity = chunkScores[0]?.similarity || 0;
    const topChunks = chunkScores.slice(0, 3).filter(c => c.similarity > 0.1);
    
    let status: EnforcedParagraph['status'];
    let enforcedText = para;
    
    if (bestSimilarity >= GROUNDED_THRESHOLD) {
      status = 'GROUNDED';
    } else if (bestSimilarity >= PARTIAL_THRESHOLD) {
      status = 'PARTIAL';
    } else {
      status = 'UNGROUNDED';
      // Replace ungrounded paragraph with placeholder
      const paraId = `para_${Date.now()}_${i}`;
      enforcedText = `[[PLACEHOLDER:MISSING_DATA:No supporting source found for this content. Original text preserved for reference - "${para.slice(0, 100)}${para.length > 100 ? '...' : ''}":${paraId}]]`;
    }
    
    results.push({
      index: i,
      originalText: para,
      enforcedText,
      status,
      bestSimilarity,
      supportingChunks: topChunks.map(c => ({
        content: c.chunk.content.slice(0, 200),
        similarity: c.similarity,
        documentId: c.chunk.documentId,
        filename: c.chunk.filename,
      })),
    });
  }
  
  return results;
}

/**
 * Main enforcement pipeline - runs synchronously before content is shown
 */
export async function enforceGeneration(
  rawContent: string,
  chunks: RetrievedChunk[],
  sectionId: string,
  organizationId: string
): Promise<EnforcementResult> {
  // Step 1: Verify claims against KB
  const { enforcedText: claimEnforcedText, replacedClaims } = enforceClaimVerification(rawContent, chunks);
  
  // Step 2: Enforce paragraph-level grounding
  const paragraphs = enforceParagraphGrounding(claimEnforcedText, chunks);
  
  // Step 3: Reconstruct content with enforced paragraphs
  const enforcedContent = paragraphs.map(p => p.enforcedText).join('\n\n');
  
  // Step 4: Calculate metadata
  const scores = chunks.map(c => c.score);
  const relevantChunks = chunks.filter(c => c.score >= MIN_CHUNK_SIMILARITY);
  
  const metadata: GenerationEnforcementMetadata = {
    retrievedChunkCount: relevantChunks.length,
    usedGenericKnowledge: relevantChunks.length < MIN_CHUNKS_FOR_GENERATION,
    minChunkSimilarity: scores.length > 0 ? Math.min(...scores) : null,
    maxChunkSimilarity: scores.length > 0 ? Math.max(...scores) : null,
    avgChunkSimilarity: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
    enforcementApplied: true,
    claimsReplaced: replacedClaims.length,
    paragraphsPlaceholdered: paragraphs.filter(p => p.status === 'UNGROUNDED').length,
    policyOverride: false,
  };
  
  // Step 5: Persist enforcement metadata
  try {
    await prisma.generationMetadata.create({
      data: {
        sectionId,
        organizationId,
        retrievedChunkCount: metadata.retrievedChunkCount,
        usedGenericKnowledge: metadata.usedGenericKnowledge,
        minChunkSimilarity: metadata.minChunkSimilarity,
        maxChunkSimilarity: metadata.maxChunkSimilarity,
        avgChunkSimilarity: metadata.avgChunkSimilarity,
        enforcementApplied: metadata.enforcementApplied,
        claimsReplaced: metadata.claimsReplaced,
        paragraphsPlaceholdered: metadata.paragraphsPlaceholdered,
        policyOverride: metadata.policyOverride,
        rawGeneration: rawContent,
        enforcedGeneration: enforcedContent,
      },
    });
    
    // Update section with generation metadata
    await prisma.proposalSection.update({
      where: { id: sectionId },
      data: {
        usedGenericKnowledge: metadata.usedGenericKnowledge,
        retrievedChunkCount: metadata.retrievedChunkCount,
        enforcementApplied: true,
      },
    });
  } catch (error) {
    console.error('Failed to persist generation metadata:', error);
    // Don't fail the generation, but log the error
  }
  
  return {
    success: true,
    enforcedContent,
    rawContent,
    metadata,
    paragraphs,
    replacedClaims,
  };
}

/**
 * Sanitize custom instructions to prevent policy bypass (AC-5.1)
 */
export function sanitizeCustomInstructions(instructions: string | undefined): {
  sanitized: string;
  policyOverride: boolean;
} {
  if (!instructions) {
    return { sanitized: '', policyOverride: false };
  }
  
  // Patterns that attempt to bypass enforcement
  const bypassPatterns = [
    /ignore\s*(?:the\s*)?placeholders?/gi,
    /don'?t\s*use\s*placeholders?/gi,
    /no\s*placeholders?/gi,
    /skip\s*(?:the\s*)?verification/gi,
    /ignore\s*(?:the\s*)?enforcement/gi,
    /be\s*(?:more\s*)?confident/gi,
    /don'?t\s*hedge/gi,
    /ignore\s*(?:the\s*)?knowledge\s*base/gi,
    /make\s*up/gi,
    /invent/gi,
    /fabricate/gi,
  ];
  
  let sanitized = instructions;
  let policyOverride = false;
  
  for (const pattern of bypassPatterns) {
    if (pattern.test(instructions)) {
      sanitized = sanitized.replace(pattern, '[POLICY_BLOCKED]');
      policyOverride = true;
    }
  }
  
  return { sanitized, policyOverride };
}
