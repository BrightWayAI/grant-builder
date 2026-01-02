/**
 * Enforcement Thresholds
 * 
 * These constants define the thresholds for all enforcement decisions.
 * They should be calibrated based on real-world usage data.
 */

export const ENFORCEMENT_THRESHOLDS = {
  // Coverage thresholds
  COVERAGE_BLOCK: 30,           // Block export if overall coverage < 30%
  COVERAGE_WARN: 50,            // Warn if overall coverage < 50%
  COVERAGE_SECTION_WARN: 40,    // Warn if any section coverage < 40%
  
  // Attribution similarity thresholds (embedding cosine similarity)
  // Cosine similarity from embeddings: 0.85+ = very similar, 0.70+ = similar, 0.50+ = related
  GROUNDED_SIMILARITY: 0.70,    // Paragraph is "grounded" if best chunk similarity >= 0.70
  PARTIAL_SIMILARITY: 0.50,     // Paragraph is "partial" if best chunk similarity >= 0.50
  
  // Claim verification
  CLAIM_VERIFY_THRESHOLD: 0.70, // Claim verified if evidence confidence >= 0.70
  
  // Word/char limit thresholds
  WORD_LIMIT_BLOCK_PERCENT: 10,  // Block if > 10% over word limit
  WORD_LIMIT_WARN_PERCENT: 0,    // Warn if any amount over (0%)
  
  // Section completion
  MIN_SECTION_CONTENT_LENGTH: 50,  // Minimum chars for a section to be "complete"
  
  // Voice thresholds (not used for blocking, just warnings)
  VOICE_ERROR_WARN_COUNT: 3,     // Warn if > 3 voice errors
  
  // Placeholder limits
  MAX_VERIFICATION_PLACEHOLDERS: 3, // Allow up to 3 VERIFICATION_NEEDED placeholders
  
  // Source freshness
  SOURCE_STALE_MONTHS: 24,          // Warn if source > 24 months old
  SOURCE_STALE_WARN_PERCENT: 50,    // Warn if > 50% sources are stale
  
  // Attribution limits
  MAX_SUPPORTING_CHUNKS: 3,         // Max chunks to store per paragraph
  MIN_PARAGRAPHS_FOR_COVERAGE: 1,   // Min paragraphs to compute coverage
} as const;

export type EnforcementThresholds = typeof ENFORCEMENT_THRESHOLDS;
