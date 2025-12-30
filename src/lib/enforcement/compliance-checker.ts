/**
 * Compliance Checker
 * 
 * Checks proposal compliance against RFP requirements:
 * - Required sections present and non-empty
 * - Word/character limits respected
 * - Outputs ComplianceStatus for export gating
 */

import prisma from '@/lib/db';
import { countWords, countCharacters } from '@/lib/utils';
import { 
  ComplianceStatus, 
  SectionStatus, 
  LimitViolation 
} from '@/types/enforcement';
import { ENFORCEMENT_THRESHOLDS } from './thresholds';

export class ComplianceChecker {
  /**
   * Check compliance for a proposal against its requirements
   */
  async checkCompliance(proposalId: string): Promise<ComplianceStatus> {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        sections: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    const sectionStatuses: SectionStatus[] = [];
    const missingSections: string[] = [];
    const emptySections: string[] = [];
    const limitViolations: LimitViolation[] = [];

    for (const section of proposal.sections) {
      const plainContent = this.stripHtml(section.content);
      const wordCount = countWords(plainContent);
      const charCount = countCharacters(plainContent);
      
      const isComplete = plainContent.length >= ENFORCEMENT_THRESHOLDS.MIN_SECTION_CONTENT_LENGTH;

      const status: SectionStatus = {
        sectionId: section.id,
        sectionName: section.sectionName,
        isRequired: section.isRequired,
        isComplete,
        wordCount,
        wordLimit: section.wordLimit || undefined,
        charLimit: section.charLimit || undefined,
        charCount
      };

      sectionStatuses.push(status);

      // Track empty required sections
      if (section.isRequired && !isComplete) {
        emptySections.push(section.sectionName);
      }

      // Check word limit violations
      if (section.wordLimit && wordCount > section.wordLimit) {
        const overagePercent = Math.round(
          ((wordCount - section.wordLimit) / section.wordLimit) * 100
        );
        limitViolations.push({
          sectionId: section.id,
          sectionName: section.sectionName,
          limitType: 'WORD',
          limit: section.wordLimit,
          actual: wordCount,
          overagePercent
        });
      }

      // Check char limit violations
      if (section.charLimit && charCount > section.charLimit) {
        const overagePercent = Math.round(
          ((charCount - section.charLimit) / section.charLimit) * 100
        );
        limitViolations.push({
          sectionId: section.id,
          sectionName: section.sectionName,
          limitType: 'CHAR',
          limit: section.charLimit,
          actual: charCount,
          overagePercent
        });
      }
    }

    // Check for required sections from parsed requirements that might be missing
    // (i.e., defined in RFP but not yet created as ProposalSection)
    const parsedRequirements = proposal.parsedRequirements as { sections?: Array<{ name: string; isRequired: boolean }> } | null;
    if (parsedRequirements?.sections) {
      const existingSectionNames = new Set(
        proposal.sections.map(s => s.sectionName.toLowerCase())
      );
      
      for (const reqSection of parsedRequirements.sections) {
        if (reqSection.isRequired) {
          const nameVariants = [
            reqSection.name.toLowerCase(),
            reqSection.name.toLowerCase().replace(/\s+/g, '_'),
            reqSection.name.toLowerCase().replace(/_/g, ' ')
          ];
          
          const found = nameVariants.some(variant => existingSectionNames.has(variant));
          if (!found && !missingSections.includes(reqSection.name)) {
            missingSections.push(reqSection.name);
          }
        }
      }
    }

    // Calculate overall status
    const hasBlockingViolations = limitViolations.some(
      v => v.overagePercent > ENFORCEMENT_THRESHOLDS.WORD_LIMIT_BLOCK_PERCENT
    );
    const hasMissingOrEmpty = missingSections.length > 0 || emptySections.length > 0;

    let overallStatus: ComplianceStatus['overallStatus'];
    if (hasBlockingViolations || hasMissingOrEmpty) {
      overallStatus = 'VIOLATIONS';
    } else if (limitViolations.length > 0) {
      overallStatus = 'INCOMPLETE';
    } else {
      overallStatus = 'COMPLETE';
    }

    // Calculate compliance score (0-100)
    const requiredSections = sectionStatuses.filter(s => s.isRequired);
    const completedRequired = requiredSections.filter(s => s.isComplete).length;
    const withinLimits = sectionStatuses.filter(s => {
      if (s.wordLimit && s.wordCount > s.wordLimit) return false;
      if (s.charLimit && s.charCount > s.charLimit) return false;
      return true;
    }).length;

    const sectionCompletionScore = requiredSections.length > 0
      ? (completedRequired / requiredSections.length) * 50
      : 50;
    const limitComplianceScore = sectionStatuses.length > 0
      ? (withinLimits / sectionStatuses.length) * 50
      : 50;
    
    const complianceScore = Math.round(sectionCompletionScore + limitComplianceScore);

    return {
      proposalId,
      overallStatus,
      requiredSections: sectionStatuses,
      missingSections,
      emptySections,
      limitViolations,
      complianceScore,
      checkedAt: new Date()
    };
  }

  /**
   * Get blocking limit violations (>10% over)
   */
  getBlockingViolations(compliance: ComplianceStatus): LimitViolation[] {
    return compliance.limitViolations.filter(
      v => v.overagePercent > ENFORCEMENT_THRESHOLDS.WORD_LIMIT_BLOCK_PERCENT
    );
  }

  /**
   * Get warning limit violations (1-10% over)
   */
  getWarningViolations(compliance: ComplianceStatus): LimitViolation[] {
    return compliance.limitViolations.filter(
      v => v.overagePercent > ENFORCEMENT_THRESHOLDS.WORD_LIMIT_WARN_PERCENT &&
           v.overagePercent <= ENFORCEMENT_THRESHOLDS.WORD_LIMIT_BLOCK_PERCENT
    );
  }

  /**
   * Strip HTML tags from content
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }
}

// Singleton instance
export const complianceChecker = new ComplianceChecker();
