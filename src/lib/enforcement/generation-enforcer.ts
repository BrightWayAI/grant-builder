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
// Lowered from 0.65 to allow more KB content to be used
const MIN_CHUNK_SIMILARITY = 0.40;

// Minimum chunks required to generate confident content
const MIN_CHUNKS_FOR_GENERATION = 1;

// Similarity threshold for grounded paragraphs
const GROUNDED_THRESHOLD = 0.55;
const PARTIAL_THRESHOLD = 0.35;

// Regex patterns for high-risk claims (AC-1.3)
const CLAIM_PATTERNS = {
  // Numbers with human context
  NUMBER: /\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:people|participants|youth|students|families|seniors|clients|members|individuals|organizations|partners|communities|staff|volunteers|employees|beneficiaries|children|adults|residents|households)\b/gi,
  // Percentages
  PERCENTAGE: /\b(\d+(?:\.\d+)?)\s*(?:%|percent)/gi,
  // Currency amounts
  CURRENCY: /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:million|billion|thousand|M|B|K)?|\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*dollars?\b/gi,
  // Specific dates
  DATE: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,?\s+\d{4})?|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b(?:19|20)\d{2}\b/gi,
  // Named organizations in partnership context
  NAMED_ORG: /\b(?:partnered?\s+with|collaboration\s+with|working\s+with|funded\s+by|supported\s+by|in\s+partnership\s+with)\s+([A-Z][A-Za-z\s&,]+?)(?:\.|,|\s+to\s|\s+for\s|\s+in\s)/gi,
  // Invented person names with titles (AC-1.3 critical fix)
  NAMED_PERSON: /\b(?:Dr\.|Mr\.|Ms\.|Mrs\.|Prof\.|Director|CEO|Executive Director|President|Coordinator|Manager|Specialist|Officer|Lead)\s+([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)\b/gi,
  // Staff/team member references with names
  STAFF_NAME: /\b(?:our|the)\s+(?:staff|team|consultant|advisor|evaluator|expert|specialist|coordinator)\s*,?\s+([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/gi,
  // Specific outcome claims
  OUTCOME: /\b(?:achieved|resulted\s+in|led\s+to|produced|generated|created|increased|decreased|reduced|improved)\s+(?:a\s+)?(\d+(?:\.\d+)?)\s*(?:%|percent|fold|x)\b/gi,
  // Location-specific claims
  LOCATION: /\b(?:located\s+(?:in|at)|based\s+in|serving|operates?\s+in)\s+([A-Z][A-Za-z\s]+(?:County|City|District|Region|Area|Community))/gi,
};

export interface CitationData {
  citationNumber: number;
  documentId: string;
  documentName: string;
  matchedText: string;
  similarity: number;
  pageNumber?: number;
  chunkId?: string;
}

export interface EnforcementResult {
  success: boolean;
  enforcedContent: string;
  rawContent: string;
  metadata: GenerationEnforcementMetadata;
  paragraphs: EnforcedParagraph[];
  replacedClaims: ReplacedClaim[];
  citations: CitationData[];
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
 * Returns clean marker for UI to render friendly empty state
 */
export function generatePlaceholderOnlyContent(sectionName: string, description?: string): string {
  return `[[EMPTY_KB:${sectionName}]]`;
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
 * Check if a claim is supported by retrieved chunks (AC-1.3 - SEMANTIC MATCHING)
 * 
 * CRITICAL FIX: Previous version only checked if a number appeared ANYWHERE in KB.
 * This caused "number collision" - e.g., KB has "$500,000 grant", LLM generates
 * "500 partner organizations", number "500" matches incorrectly.
 * 
 * New approach: Check if BOTH the value AND contextual meaning match.
 */
function isClaimSupported(
  claim: { type: string; value: string; context: string }, 
  chunks: RetrievedChunk[]
): boolean {
  const claimValue = claim.value.toLowerCase();
  const claimContext = claim.context.toLowerCase();
  
  // Extract key contextual words around the claim
  const contextWords = extractContextWords(claimContext);
  
  for (const chunk of chunks) {
    const chunkLower = chunk.content.toLowerCase();
    
    // Step 1: Check if the exact claim value appears in chunk
    const normalizedClaimValue = claimValue.replace(/[,\s]+/g, '');
    const normalizedChunk = chunkLower.replace(/[,\s]+/g, '');
    
    if (!normalizedChunk.includes(normalizedClaimValue)) {
      // For numbers, also try just the numeric portion
      const numberMatch = claim.value.match(/\d[\d,.]*/);
      if (!numberMatch) continue;
      
      const number = numberMatch[0].replace(/,/g, '');
      if (!normalizedChunk.includes(number)) continue;
    }
    
    // Step 2: CRITICAL - Verify contextual match (prevents number collision)
    // The claim's context words must also appear near the number in the chunk
    const contextMatchScore = calculateContextOverlap(contextWords, chunkLower, claim.value);
    
    // Require at least 25% of context words to match for verification
    // (Balance between catching fabrications and not over-rejecting valid paraphrases)
    if (contextMatchScore >= 0.25) {
      return true;
    }
    
    // Step 3: For named entities (people, orgs), require exact name match
    if (claim.type === 'NAMED_PERSON' || claim.type === 'STAFF_NAME') {
      // Extract the name portion and require exact match
      const nameMatch = claim.value.match(/([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/);
      if (nameMatch) {
        const name = nameMatch[1].toLowerCase();
        if (chunkLower.includes(name)) {
          return true;
        }
      }
      // Names must be exact match - no fuzzy matching
      continue;
    }
    
    // Step 4: For organizations, check if org name appears
    if (claim.type === 'NAMED_ORG') {
      const orgMatch = claim.value.match(/(?:with|by)\s+([A-Z][A-Za-z\s&,]+)/i);
      if (orgMatch) {
        const orgName = orgMatch[1].toLowerCase().trim();
        if (chunkLower.includes(orgName)) {
          return true;
        }
      }
      continue;
    }
  }
  
  return false;
}

/**
 * Extract meaningful context words around a claim
 */
function extractContextWords(context: string): string[] {
  // Remove the claim value itself and common stop words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that', 'these',
    'those', 'it', 'its', 'we', 'our', 'they', 'their', 'he', 'she', 'his', 'her'
  ]);
  
  return context
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word) && !/^\d+$/.test(word));
}

/**
 * Calculate how well context words match near the claim value in a chunk
 */
function calculateContextOverlap(
  contextWords: string[], 
  chunkText: string,
  claimValue: string
): number {
  if (contextWords.length === 0) return 0;
  
  // Find where the claim value (or its number) appears in the chunk
  const claimLower = claimValue.toLowerCase();
  const numberMatch = claimValue.match(/\d[\d,.]*/);
  const searchTerm = numberMatch ? numberMatch[0].replace(/,/g, '') : claimLower;
  
  const valueIndex = chunkText.indexOf(searchTerm);
  if (valueIndex < 0) return 0;
  
  // Look at a window around where the value appears (100 chars each side)
  const windowStart = Math.max(0, valueIndex - 100);
  const windowEnd = Math.min(chunkText.length, valueIndex + searchTerm.length + 100);
  const nearbyText = chunkText.slice(windowStart, windowEnd);
  
  // Count how many context words appear in the nearby window
  let matchCount = 0;
  for (const word of contextWords) {
    if (nearbyText.includes(word)) {
      matchCount++;
    }
  }
  
  return matchCount / contextWords.length;
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
    // Pass claim type for type-specific verification (names vs numbers)
    if (!isClaimSupported({ type: claim.type, value: claim.value, context: claim.context }, chunks)) {
      const claimId = `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // More specific placeholder messages based on claim type
      let placeholderType = 'VERIFICATION_NEEDED';
      let message = `Unverified ${claim.type.toLowerCase()} removed - please verify: "${claim.value}"`;
      
      if (claim.type === 'NAMED_PERSON' || claim.type === 'STAFF_NAME') {
        placeholderType = 'MISSING_DATA';
        message = `Person name not found in knowledge base - verify this is a real team member: "${claim.value}"`;
      } else if (claim.type === 'NAMED_ORG') {
        placeholderType = 'VERIFICATION_NEEDED';
        message = `Partner organization not found in knowledge base: "${claim.value}"`;
      } else if (claim.type === 'OUTCOME') {
        placeholderType = 'VERIFICATION_NEEDED';
        message = `Outcome claim requires verification: "${claim.value}"`;
      }
      
      const placeholder = `[[PLACEHOLDER:${placeholderType}:${message}:${claimId}]]`;
      
      enforcedText = enforcedText.slice(0, claim.start) + placeholder + enforcedText.slice(claim.end);
      
      replacedClaims.push({
        id: claimId,
        type: claim.type,
        originalText: claim.value,
        context: claim.context,
        positionStart: claim.start,
        positionEnd: claim.end,
        reason: claim.type.includes('NAME') ? 'Name not found in knowledge base' : 'Claim context not verified against knowledge base',
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
 * Inject citation markers into text based on supporting chunks
 * Returns text with {{cite:N}} markers and citation data array
 */
export function injectCitations(
  text: string,
  paragraphs: EnforcedParagraph[]
): { citedText: string; citations: CitationData[] } {
  const citations: CitationData[] = [];
  let citationCounter = 1;
  const usedChunkIds = new Set<string>();
  
  // Build a map of paragraph index to its position in the full text
  let citedText = '';
  
  for (const para of paragraphs) {
    // Skip placeholder paragraphs - no citations needed
    if (para.status === 'PLACEHOLDER' || para.status === 'UNGROUNDED') {
      citedText += para.enforcedText + '\n\n';
      continue;
    }
    
    let paraText = para.enforcedText;
    
    // Add citations at the end of sentences that have strong supporting chunks
    if (para.supportingChunks.length > 0 && para.bestSimilarity >= 0.50) {
      // Find the best unique chunks for this paragraph (avoid duplicates)
      const uniqueChunks = para.supportingChunks.filter(c => {
        const chunkKey = `${c.documentId}_${c.content.slice(0, 50)}`;
        if (usedChunkIds.has(chunkKey)) return false;
        usedChunkIds.add(chunkKey);
        return true;
      }).slice(0, 2); // Max 2 citations per paragraph
      
      for (const chunk of uniqueChunks) {
        const citation: CitationData = {
          citationNumber: citationCounter,
          documentId: chunk.documentId,
          documentName: chunk.filename,
          matchedText: chunk.content.slice(0, 150) + (chunk.content.length > 150 ? '...' : ''),
          similarity: chunk.similarity,
        };
        citations.push(citation);
        
        // Find a good place to insert the citation (end of a sentence)
        const sentenceEndRegex = /([.!?])(\s|$)/g;
        let lastMatch: RegExpExecArray | null = null;
        let match: RegExpExecArray | null;
        
        while ((match = sentenceEndRegex.exec(paraText)) !== null) {
          lastMatch = match;
        }
        
        if (lastMatch) {
          // Insert citation before the last period
          const insertPos = lastMatch.index + 1;
          paraText = paraText.slice(0, insertPos) + `{{cite:${citationCounter}}}` + paraText.slice(insertPos);
        } else {
          // No sentence end found, append to end
          paraText += `{{cite:${citationCounter}}}`;
        }
        
        citationCounter++;
      }
    }
    
    citedText += paraText + '\n\n';
  }
  
  return { citedText: citedText.trim(), citations };
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
  
  // Step 3: Inject citations into grounded paragraphs
  const { citedText, citations } = injectCitations(claimEnforcedText, paragraphs);
  
  // Step 4: Reconstruct content with enforced paragraphs (using cited text)
  const enforcedContent = citedText;
  
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
    citations,
  };
}

/**
 * Sanitize custom instructions to prevent policy bypass (AC-5.1)
 * 
 * EXPANDED: Previous version missed creative bypass attempts like
 * "provide reasonable estimates" or "feel free to assume".
 */
export function sanitizeCustomInstructions(instructions: string | undefined): {
  sanitized: string;
  policyOverride: boolean;
  blockedPatterns: string[];
} {
  if (!instructions) {
    return { sanitized: '', policyOverride: false, blockedPatterns: [] };
  }
  
  // Patterns that attempt to bypass enforcement (AC-5.1)
  // Organized by bypass category
  const bypassPatterns: Array<{ pattern: RegExp; category: string }> = [
    // Direct placeholder bypass
    { pattern: /ignore\s*(?:the\s*)?placeholders?/gi, category: 'placeholder_bypass' },
    { pattern: /don'?t\s*(?:use|add|include)\s*placeholders?/gi, category: 'placeholder_bypass' },
    { pattern: /no\s*placeholders?/gi, category: 'placeholder_bypass' },
    { pattern: /remove\s*(?:the\s*)?placeholders?/gi, category: 'placeholder_bypass' },
    { pattern: /fill\s*in\s*(?:the\s*)?placeholders?/gi, category: 'placeholder_bypass' },
    
    // Verification bypass
    { pattern: /skip\s*(?:the\s*)?verification/gi, category: 'verification_bypass' },
    { pattern: /ignore\s*(?:the\s*)?enforcement/gi, category: 'verification_bypass' },
    { pattern: /bypass\s*(?:the\s*)?(?:checks?|validation)/gi, category: 'verification_bypass' },
    { pattern: /don'?t\s*(?:verify|check|validate)/gi, category: 'verification_bypass' },
    
    // Confidence manipulation
    { pattern: /be\s*(?:more\s*)?confident/gi, category: 'confidence_manipulation' },
    { pattern: /don'?t\s*(?:hedge|qualify|caveat)/gi, category: 'confidence_manipulation' },
    { pattern: /sound\s*(?:more\s*)?certain/gi, category: 'confidence_manipulation' },
    { pattern: /remove\s*(?:the\s*)?(?:uncertainty|hedging|qualifications?)/gi, category: 'confidence_manipulation' },
    { pattern: /be\s*(?:more\s*)?assertive/gi, category: 'confidence_manipulation' },
    
    // Knowledge base bypass
    { pattern: /ignore\s*(?:the\s*)?knowledge\s*base/gi, category: 'kb_bypass' },
    { pattern: /don'?t\s*(?:use|rely\s*on)\s*(?:the\s*)?(?:knowledge\s*base|kb|sources?)/gi, category: 'kb_bypass' },
    { pattern: /without\s*(?:using\s*)?(?:the\s*)?sources?/gi, category: 'kb_bypass' },
    
    // Fabrication requests (CRITICAL - AC-1.3)
    { pattern: /make\s*up/gi, category: 'fabrication' },
    { pattern: /invent(?:ed)?/gi, category: 'fabrication' },
    { pattern: /fabricate/gi, category: 'fabrication' },
    { pattern: /create\s*(?:fake|fictional|made[\s-]?up)/gi, category: 'fabrication' },
    
    // Estimation bypass (NEW - catches "provide reasonable estimates")
    { pattern: /(?:provide|give|use|make)\s*(?:reasonable|rough|approximate)?\s*estimates?/gi, category: 'estimation_bypass' },
    { pattern: /estimate\s*(?:the\s*)?(?:numbers?|statistics?|data|figures?)/gi, category: 'estimation_bypass' },
    { pattern: /(?:feel\s*free|go\s*ahead)\s*(?:to\s*)?(?:estimate|assume|guess)/gi, category: 'estimation_bypass' },
    { pattern: /assume\s*(?:reasonable|typical|average)\s*(?:numbers?|values?|figures?)/gi, category: 'estimation_bypass' },
    { pattern: /use\s*(?:your\s*)?(?:best\s*)?(?:judgment|guess)/gi, category: 'estimation_bypass' },
    
    // Creative/flexible requests that could enable hallucination
    { pattern: /be\s*creative\s*with\s*(?:the\s*)?(?:numbers?|statistics?|data|facts?)/gi, category: 'creative_bypass' },
    { pattern: /(?:take\s*)?(?:creative\s*)?liberties/gi, category: 'creative_bypass' },
    { pattern: /(?:extrapolate|interpolate)\s*(?:from|based\s*on)/gi, category: 'creative_bypass' },
    { pattern: /(?:similar|typical)\s*organizations?\s*(?:might|would|could)/gi, category: 'creative_bypass' },
    
    // Role-play bypasses
    { pattern: /pretend\s*(?:you\s*)?(?:have|know|are)/gi, category: 'roleplay_bypass' },
    { pattern: /act\s*as\s*if\s*(?:you\s*)?(?:have|know)/gi, category: 'roleplay_bypass' },
    { pattern: /imagine\s*(?:you\s*)?(?:have|know)\s*(?:the\s*)?data/gi, category: 'roleplay_bypass' },
  ];
  
  let sanitized = instructions;
  let policyOverride = false;
  const blockedPatterns: string[] = [];
  
  for (const { pattern, category } of bypassPatterns) {
    if (pattern.test(instructions)) {
      const matches = instructions.match(pattern);
      if (matches) {
        blockedPatterns.push(`${category}: "${matches[0]}"`);
      }
      sanitized = sanitized.replace(pattern, '[POLICY_BLOCKED]');
      policyOverride = true;
    }
  }
  
  return { sanitized, policyOverride, blockedPatterns };
}
