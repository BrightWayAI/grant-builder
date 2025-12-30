/**
 * Live Compliance Status API (AC-2.5)
 * 
 * Returns real-time compliance status for a proposal, including:
 * - Section coverage scores
 * - Word/character limit violations
 * - Missing required sections
 * - Unresolved placeholders
 * - Unresolved ambiguities
 * - Checklist completion status
 * - Overall proposal health
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import prisma from "@/lib/db";

export interface ComplianceIssue {
  type: 'COVERAGE_LOW' | 'COVERAGE_CRITICAL' | 'WORD_LIMIT' | 'CHAR_LIMIT' | 'MISSING_SECTION' | 'EMPTY_SECTION' | 'UNRESOLVED_PLACEHOLDER' | 'UNRESOLVED_AMBIGUITY' | 'CHECKLIST_INCOMPLETE' | 'ENFORCEMENT_FAILURE' | 'GENERIC_KNOWLEDGE';
  severity: 'ERROR' | 'WARNING' | 'INFO';
  sectionId?: string;
  sectionName?: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface SectionComplianceStatus {
  id: string;
  name: string;
  wordCount: number;
  wordLimit: number | null;
  charCount: number;
  charLimit: number | null;
  coverageScore: number | null;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL' | 'UNKNOWN';
  usedGenericKnowledge: boolean;
  enforcementApplied: boolean;
  placeholderCount: number;
  issues: ComplianceIssue[];
}

export interface ComplianceStatus {
  proposalId: string;
  overallScore: number;
  overallConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL' | 'UNKNOWN';
  canExport: boolean;
  blockingIssues: ComplianceIssue[];
  warningIssues: ComplianceIssue[];
  sections: SectionComplianceStatus[];
  checklistStatus: {
    total: number;
    complete: number;
    incomplete: string[];
  };
  enforcementFailure: boolean;
  lastUpdated: string;
}

function getConfidenceLevel(coverageScore: number | null): ComplianceStatus['overallConfidence'] {
  if (coverageScore === null) return 'UNKNOWN';
  if (coverageScore >= 80) return 'HIGH';
  if (coverageScore >= 50) return 'MEDIUM';
  if (coverageScore >= 30) return 'LOW';
  return 'CRITICAL';
}

function countPlaceholders(content: string): number {
  const matches = content.match(/\[\[PLACEHOLDER:/g);
  return matches ? matches.length : 0;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { organizationId } = await requireOrganization();

    const proposal = await prisma.proposal.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: {
            coverageRecord: true,
            placeholders: {
              where: { resolved: false },
            },
          },
        },
        ambiguityFlags: {
          where: { resolved: false },
        },
        checklistItems: {
          include: {
            sectionMappings: true,
          },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const blockingIssues: ComplianceIssue[] = [];
    const warningIssues: ComplianceIssue[] = [];
    const sectionStatuses: SectionComplianceStatus[] = [];

    // Check each section
    for (const section of proposal.sections) {
      const sectionIssues: ComplianceIssue[] = [];
      const wordCount = countWords(section.content);
      const charCount = section.content.length;
      const placeholderCount = countPlaceholders(section.content);
      const coverageScore = section.coverageRecord?.coverageScore ?? null;
      const confidenceLevel = getConfidenceLevel(coverageScore);

      // Check coverage (AC-1.4, AC-4.3)
      if (coverageScore !== null) {
        if (coverageScore < 30) {
          const issue: ComplianceIssue = {
            type: 'COVERAGE_CRITICAL',
            severity: 'ERROR',
            sectionId: section.id,
            sectionName: section.sectionName,
            message: `Source coverage critically low (${coverageScore}%)`,
            details: { coverageScore },
          };
          sectionIssues.push(issue);
          blockingIssues.push(issue);
        } else if (coverageScore < 50) {
          const issue: ComplianceIssue = {
            type: 'COVERAGE_LOW',
            severity: 'WARNING',
            sectionId: section.id,
            sectionName: section.sectionName,
            message: `Source coverage low (${coverageScore}%)`,
            details: { coverageScore },
          };
          sectionIssues.push(issue);
          warningIssues.push(issue);
        }
      }

      // Check word limits (AC-2.3)
      if (section.wordLimit && wordCount > section.wordLimit * 1.1) {
        const issue: ComplianceIssue = {
          type: 'WORD_LIMIT',
          severity: 'ERROR',
          sectionId: section.id,
          sectionName: section.sectionName,
          message: `Exceeds word limit by ${Math.round((wordCount / section.wordLimit - 1) * 100)}% (${wordCount}/${section.wordLimit})`,
          details: { wordCount, wordLimit: section.wordLimit },
        };
        sectionIssues.push(issue);
        blockingIssues.push(issue);
      } else if (section.wordLimit && wordCount > section.wordLimit) {
        const issue: ComplianceIssue = {
          type: 'WORD_LIMIT',
          severity: 'WARNING',
          sectionId: section.id,
          sectionName: section.sectionName,
          message: `Slightly over word limit (${wordCount}/${section.wordLimit})`,
          details: { wordCount, wordLimit: section.wordLimit },
        };
        sectionIssues.push(issue);
        warningIssues.push(issue);
      }

      // Check character limits
      if (section.charLimit && charCount > section.charLimit) {
        const issue: ComplianceIssue = {
          type: 'CHAR_LIMIT',
          severity: 'ERROR',
          sectionId: section.id,
          sectionName: section.sectionName,
          message: `Exceeds character limit (${charCount}/${section.charLimit})`,
          details: { charCount, charLimit: section.charLimit },
        };
        sectionIssues.push(issue);
        blockingIssues.push(issue);
      }

      // Check empty required sections (AC-2.3)
      if (section.isRequired && section.content.trim().length === 0) {
        const issue: ComplianceIssue = {
          type: 'EMPTY_SECTION',
          severity: 'ERROR',
          sectionId: section.id,
          sectionName: section.sectionName,
          message: `Required section "${section.sectionName}" is empty`,
        };
        sectionIssues.push(issue);
        blockingIssues.push(issue);
      }

      // Check unresolved placeholders
      if (placeholderCount > 0) {
        const issue: ComplianceIssue = {
          type: 'UNRESOLVED_PLACEHOLDER',
          severity: 'ERROR',
          sectionId: section.id,
          sectionName: section.sectionName,
          message: `${placeholderCount} unresolved placeholder(s) in "${section.sectionName}"`,
          details: { placeholderCount },
        };
        sectionIssues.push(issue);
        blockingIssues.push(issue);
      }

      // Check generic knowledge usage (AC-4.4)
      if (section.usedGenericKnowledge) {
        const issue: ComplianceIssue = {
          type: 'GENERIC_KNOWLEDGE',
          severity: 'WARNING',
          sectionId: section.id,
          sectionName: section.sectionName,
          message: `"${section.sectionName}" was generated without supporting sources`,
        };
        sectionIssues.push(issue);
        warningIssues.push(issue);
      }

      sectionStatuses.push({
        id: section.id,
        name: section.sectionName,
        wordCount,
        wordLimit: section.wordLimit,
        charCount,
        charLimit: section.charLimit,
        coverageScore,
        confidenceLevel,
        usedGenericKnowledge: section.usedGenericKnowledge,
        enforcementApplied: section.enforcementApplied,
        placeholderCount,
        issues: sectionIssues,
      });
    }

    // Check unresolved ambiguities (AC-2.4)
    for (const ambiguity of proposal.ambiguityFlags) {
      if (ambiguity.requiresUserInput) {
        const issue: ComplianceIssue = {
          type: 'UNRESOLVED_AMBIGUITY',
          severity: 'ERROR',
          message: ambiguity.description,
          details: { ambiguityType: ambiguity.ambiguityType },
        };
        blockingIssues.push(issue);
      }
    }

    // Check checklist completion (AC-2.2)
    const checklistItems = proposal.checklistItems;
    const incompleteItems: string[] = [];
    
    for (const item of checklistItems) {
      if (item.isRequired) {
        const mappedSections = item.sectionMappings;
        if (mappedSections.length === 0) {
          incompleteItems.push(item.name);
        } else {
          // Check if any mapped section has content
          const mappedSectionIds = mappedSections.map(m => m.sectionId);
          const hasContent = proposal.sections.some(
            s => mappedSectionIds.includes(s.id) && s.content.trim().length > 0
          );
          if (!hasContent) {
            incompleteItems.push(item.name);
          }
        }
      }
    }

    if (incompleteItems.length > 0) {
      const issue: ComplianceIssue = {
        type: 'CHECKLIST_INCOMPLETE',
        severity: 'ERROR',
        message: `${incompleteItems.length} required checklist item(s) incomplete`,
        details: { incompleteItems },
      };
      blockingIssues.push(issue);
    }

    // Check enforcement failure flag (AC-5.3)
    if (proposal.enforcementFailure) {
      const issue: ComplianceIssue = {
        type: 'ENFORCEMENT_FAILURE',
        severity: 'ERROR',
        message: 'Enforcement validation failed for this proposal',
      };
      blockingIssues.push(issue);
    }

    // Calculate overall score
    const coverageScores = sectionStatuses
      .map(s => s.coverageScore)
      .filter((s): s is number => s !== null);
    
    const overallScore = coverageScores.length > 0
      ? Math.round(coverageScores.reduce((a, b) => a + b, 0) / coverageScores.length)
      : 0;

    const status: ComplianceStatus = {
      proposalId: proposal.id,
      overallScore,
      overallConfidence: getConfidenceLevel(overallScore),
      canExport: blockingIssues.length === 0,
      blockingIssues,
      warningIssues,
      sections: sectionStatuses,
      checklistStatus: {
        total: checklistItems.filter(i => i.isRequired).length,
        complete: checklistItems.filter(i => i.isRequired).length - incompleteItems.length,
        incomplete: incompleteItems,
      },
      enforcementFailure: proposal.enforcementFailure,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error("Compliance status error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to get compliance status" }, { status: 500 });
  }
}
