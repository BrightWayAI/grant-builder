/**
 * Beacon Enforcement System Types
 * 
 * These types define the data structures for the enforcement pipeline:
 * - Attribution (paragraph-to-source mapping)
 * - Claims (extracted factual claims and verification)
 * - Coverage (section and proposal coverage scores)
 * - Compliance (RFP requirement compliance)
 * - Export Gate (decision point for export blocking)
 */

// ============ RETRIEVAL ============

export interface RetrievedChunkForAttribution {
  id: string;
  documentId: string;
  documentName: string;
  documentType: string;
  text: string;
  score: number;
  programArea?: string;
}

// ============ ATTRIBUTION ============

export type ParagraphStatus = 'GROUNDED' | 'PARTIAL' | 'UNGROUNDED' | 'FAILED';

export type ParagraphFlag = 
  | 'NO_SOURCE'
  | 'LOW_CONFIDENCE'
  | 'CONTAINS_PLACEHOLDER'
  | 'USER_EDITED'
  | 'ATTRIBUTION_FAILED';

export interface ChunkAttribution {
  chunkId: string;
  documentId: string;
  documentName: string;
  similarity: number;
  matchedSpan?: string;
}

export interface AttributedParagraph {
  id: string;
  sectionId: string;
  index: number;
  text: string;
  supportingChunks: ChunkAttribution[];
  attributionScore: number;
  status: ParagraphStatus;
  flags: ParagraphFlag[];
}

// ============ COVERAGE ============

export interface SourceContribution {
  documentId: string;
  documentName: string;
  documentType: string;
  contributionPercent: number;
  paragraphsSupported: number;
}

export interface SectionCoverage {
  sectionId: string;
  sectionName: string;
  coverageScore: number;
  groundedCount: number;
  partialCount: number;
  ungroundedCount: number;
  totalParagraphs: number;
  sourceDocuments: SourceContribution[];
  computedAt: Date;
}

export interface ProposalCoverage {
  proposalId: string;
  overallScore: number;
  sectionScores: SectionCoverage[];
  lowestSection: { name: string; score: number } | null;
  documentsUsed: number;
  totalParagraphs: number;
  groundedParagraphs: number;
  computedAt: Date;
}

// ============ CLAIMS ============

export type ClaimType = 
  | 'NUMBER'
  | 'PERCENTAGE'
  | 'CURRENCY'
  | 'DATE'
  | 'ORGANIZATION'
  | 'LOCATION'
  | 'OUTCOME';

export type ClaimRiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type ClaimStatus = 'VERIFIED' | 'UNVERIFIED' | 'CONFLICTING' | 'OUTDATED';

export interface ExtractedClaim {
  id: string;
  paragraphId: string;
  type: ClaimType;
  value: string;
  context: string;
  position: { start: number; end: number };
  riskLevel: ClaimRiskLevel;
}

export interface ClaimEvidence {
  chunkId: string;
  documentId: string;
  documentName: string;
  matchedText: string;
  documentDate?: Date;
  confidence: number;
}

export interface VerifiedClaim extends ExtractedClaim {
  status: ClaimStatus;
  evidence: ClaimEvidence[];
  verificationScore: number;
}

export interface ClaimVerificationSummary {
  proposalId: string;
  totalClaims: number;
  verified: number;
  unverified: number;
  highRiskUnverified: number;
  conflicting: number;
  outdated: number;
  verificationRate: number;
  claims: VerifiedClaim[];
}

// ============ PLACEHOLDERS ============

export type PlaceholderType = 'MISSING_DATA' | 'USER_INPUT_REQUIRED' | 'VERIFICATION_NEEDED';

export interface Placeholder {
  id: string;
  sectionId: string;
  type: PlaceholderType;
  description: string;
  suggestedSources: string[];
  position: { start: number; end: number };
  resolved: boolean;
  resolvedContent?: string;
  resolvedAt?: Date;
}

export interface PlaceholderSummary {
  proposalId: string;
  total: number;
  unresolved: number;
  byType: Record<PlaceholderType, number>;
  placeholders: Placeholder[];
}

// Placeholder format in content: [[PLACEHOLDER:TYPE:DESCRIPTION:ID]]
export const PLACEHOLDER_REGEX = /\[\[PLACEHOLDER:([A-Z_]+):([^:\]]+):([a-z0-9_]+)\]\]/g;

// ============ COMPLIANCE ============

export interface SectionStatus {
  sectionId: string;
  sectionName: string;
  isRequired: boolean;
  isComplete: boolean;
  wordCount: number;
  wordLimit?: number;
  charLimit?: number;
  charCount: number;
}

export interface LimitViolation {
  sectionId: string;
  sectionName: string;
  limitType: 'WORD' | 'CHAR';
  limit: number;
  actual: number;
  overagePercent: number;
}

export interface ComplianceStatus {
  proposalId: string;
  overallStatus: 'COMPLETE' | 'INCOMPLETE' | 'VIOLATIONS';
  requiredSections: SectionStatus[];
  missingSections: string[];
  emptySections: string[];
  limitViolations: LimitViolation[];
  complianceScore: number;
  checkedAt: Date;
}

// ============ AMBIGUITY ============

export type AmbiguityType = 'CONTRADICTORY' | 'VAGUE' | 'IMPLICIT' | 'SCOPE_UNCLEAR';

export interface AmbiguityFlag {
  id: string;
  proposalId: string;
  type: AmbiguityType;
  description: string;
  sourceTexts: string[];
  suggestedResolutions: string[];
  requiresUserInput: boolean;
  resolved: boolean;
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
}

export interface AmbiguitySummary {
  proposalId: string;
  total: number;
  unresolved: number;
  requiresInput: number;
  ambiguities: AmbiguityFlag[];
}

// ============ EXPORT GATE ============

export type ExportDecision = 'ALLOW' | 'WARN' | 'BLOCK';

export interface ExportBlock {
  ruleId: string;
  ac: string;
  reason: string;
  affectedItems: string[];
  resolution: string;
}

export interface ExportWarning {
  ruleId: string;
  ac: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  affectedItems: string[];
}

export interface ExportGateResult {
  allowed: boolean;
  decision: ExportDecision;
  blocks: ExportBlock[];
  warnings: ExportWarning[];
  attestationRequired: boolean;
  attestationText?: string;
}

export interface EnforcementSnapshot {
  coverageScore: number | null;
  verificationRate: number | null;
  complianceScore: number | null;
  voiceScore: number | null;
}

export interface ExportAuditRecord {
  id: string;
  proposalId: string;
  userId: string;
  timestamp: Date;
  decision: ExportDecision;
  exportFormat: 'DOCX' | 'PDF' | 'CLIPBOARD';
  blocks: ExportBlock[];
  warnings: ExportWarning[];
  attestationText?: string;
  attestationTimestamp?: Date;
  enforcementSnapshot: EnforcementSnapshot;
}

// ============ ENFORCEMENT DATA ============

export interface EnforcementData {
  coverage: ProposalCoverage | null;
  claims: ClaimVerificationSummary | null;
  compliance: ComplianceStatus | null;
  placeholders: PlaceholderSummary | null;
  ambiguities: AmbiguitySummary | null;
  voice: { score: number; violations: unknown[] } | null;
}

// ============ GATE RESULT (for API) ============

export interface ExportGateResponse {
  gateResult: ExportGateResult;
  enforcement: EnforcementData;
}
