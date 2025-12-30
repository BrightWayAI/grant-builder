# Changelog

## [Unreleased] - Enforcement System MVP

### Added

#### Enforcement Architecture
A comprehensive enforcement system has been implemented to prevent hallucinations and ensure proposal quality. This system enforces acceptance criteria at the code level, not just through prompts.

**New Components:**

1. **Export Gatekeeper** (`src/lib/enforcement/export-gate.ts`)
   - Single decision point for all export operations
   - Evaluates compliance, coverage, claims, placeholders, and ambiguities
   - **FAIL CLOSED**: If any enforcement data cannot be loaded, export is BLOCKED
   - Creates audit records for every export attempt

2. **Compliance Checker** (`src/lib/enforcement/compliance-checker.ts`)
   - Validates required sections are present and non-empty
   - Checks word/character limit violations
   - Provides compliance scoring (0-100%)

3. **Placeholder Detector** (`src/lib/enforcement/placeholder-detector.ts`)
   - Detects `[[PLACEHOLDER:TYPE:DESCRIPTION:ID]]` patterns in content
   - Tracks resolution status
   - BLOCKS export for unresolved MISSING_DATA and USER_INPUT_REQUIRED placeholders

4. **Citation Mapper** (`src/lib/enforcement/citation-mapper.ts`)
   - Maps generated paragraphs to source chunks from knowledge base
   - Computes attribution scores using text similarity
   - Classifies paragraphs as GROUNDED, PARTIAL, or UNGROUNDED

5. **Coverage Scorer** (`src/lib/enforcement/coverage-scorer.ts`)
   - Computes section-level and proposal-level coverage scores
   - Aggregates source document contributions

6. **Claim Verifier** (`src/lib/enforcement/claim-verifier.ts`)
   - Extracts factual claims (numbers, percentages, currencies, dates, organizations, outcomes)
   - Verifies claims against knowledge base
   - Classifies claims by risk level (HIGH/MEDIUM/LOW)
   - **BLOCKS export for unverified HIGH-risk claims**

7. **Ambiguity Detector** (`src/lib/enforcement/ambiguity-detector.ts`)
   - Detects contradictory, vague, implicit, or unclear RFP requirements
   - Flags issues that require user clarification
   - **BLOCKS export for unresolved ambiguities requiring user input**

#### Database Models
New Prisma models for enforcement data persistence:
- `AttributedParagraph` - Paragraph-level source attribution
- `VerifiedClaim` - Extracted and verified claims
- `SectionCoverageRecord` - Coverage scores per section
- `AmbiguityFlagRecord` - RFP ambiguity flags
- `PlaceholderRecord` - Placeholder tracking
- `ExportAuditLog` - Audit trail for export decisions

#### API Endpoints
- `POST /api/export/gate` - Evaluate export gate before exporting
- `POST /api/export/attestation` - Record user attestation for warned exports
- Updated `POST /api/export/docx` - Now enforces export gate

#### UI Changes
- Updated Export Dialog with gate result display
- Shows blocking issues with resolution steps
- Shows warnings with attestation checkbox when required
- Visual distinction between blocked, warned, and allowed states

### Export Gate Rules

#### BLOCK Rules (Cannot Override)
| Rule | AC | Condition |
|------|-----|-----------|
| HIGH_RISK_UNVERIFIED | AC-1.3 | Any HIGH-risk claim unverified |
| COVERAGE_CRITICAL | AC-1.5 | Overall coverage < 30% |
| REQUIRED_SECTION_MISSING | AC-2.3 | Required section not present |
| REQUIRED_SECTION_EMPTY | AC-2.3 | Required section has < 50 chars |
| WORD_LIMIT_CRITICAL | AC-2.3 | Any section > 10% over word limit |
| UNRESOLVED_PLACEHOLDER | AC-1.2 | MISSING_DATA or USER_INPUT_REQUIRED placeholders |
| UNRESOLVED_AMBIGUITY | AC-2.4 | Ambiguities requiring user input |

#### WARN Rules (Require Attestation)
| Rule | AC | Condition |
|------|-----|-----------|
| COVERAGE_LOW | AC-1.5 | Overall coverage 30-50% |
| UNVERIFIED_MEDIUM_CLAIMS | AC-1.3 | MEDIUM-risk claims unverified |
| WORD_LIMIT_WARN | AC-2.3 | Any section 1-10% over word limit |

### Thresholds
Configurable thresholds in `src/lib/enforcement/thresholds.ts`:
- `COVERAGE_BLOCK: 30` - Block if coverage < 30%
- `COVERAGE_WARN: 50` - Warn if coverage < 50%
- `GROUNDED_SIMILARITY: 0.70` - Paragraph "grounded" threshold
- `PARTIAL_SIMILARITY: 0.45` - Paragraph "partial" threshold
- `CLAIM_VERIFY_THRESHOLD: 0.70` - Claim verification threshold
- `WORD_LIMIT_BLOCK_PERCENT: 10` - Block if > 10% over limit
- `MIN_SECTION_CONTENT_LENGTH: 50` - Minimum chars for "complete"

### Known Limitations

**NOT YET ENFORCED:**
1. **Voice Profile** - Not implemented. Voice scoring is stubbed and does not block export.
2. **Deep Citation UI** - Paragraph-level source indicators not visible in editor UI yet.
3. **Real-time Coverage Display** - Coverage badges not shown in editor sidebar.
4. **Claim Inline Highlighting** - Unverified claims not highlighted in editor.
5. **Ambiguity Resolution UI** - No UI for resolving ambiguities yet.

**LIMITATIONS:**
1. Citation mapping uses text similarity, not embeddings for generated content
2. Claim extraction may miss complex phrasing
3. Ambiguity detection relies on heuristics and LLM, may have false positives/negatives
4. Coverage computation runs asynchronously after save, may not be immediately available

### Testing

Run tests with:
```bash
npm test
```

Tests added:
- `compliance-checker.test.ts` - Compliance validation
- `placeholder-detector.test.ts` - Placeholder detection
- `export-gate.test.ts` - Export gate decision rules

### Migration

Run Prisma migration:
```bash
npx prisma generate
npx prisma db push  # For development
# OR
npx prisma migrate dev --name add_enforcement_system  # For production
```
