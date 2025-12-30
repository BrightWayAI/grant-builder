/**
 * Compliance Checker Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComplianceChecker } from './compliance-checker';
import { ENFORCEMENT_THRESHOLDS } from './thresholds';

// Mock Prisma
vi.mock('@/lib/db', () => ({
  default: {
    proposal: {
      findUnique: vi.fn()
    }
  }
}));

import prisma from '@/lib/db';

describe('ComplianceChecker', () => {
  const checker = new ComplianceChecker();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkCompliance', () => {
    it('should return COMPLETE status when all required sections are filled', async () => {
      const mockProposal = {
        id: 'prop1',
        parsedRequirements: null,
        sections: [
          {
            id: 'sec1',
            sectionName: 'Executive Summary',
            content: '<p>This is a complete executive summary with enough content to pass the minimum threshold.</p>',
            isRequired: true,
            wordLimit: null,
            charLimit: null
          },
          {
            id: 'sec2',
            sectionName: 'Statement of Need',
            content: '<p>This describes the need in the community that we are addressing with this proposal.</p>',
            isRequired: true,
            wordLimit: 500,
            charLimit: null
          }
        ]
      };

      vi.mocked(prisma.proposal.findUnique).mockResolvedValue(mockProposal as any);

      const result = await checker.checkCompliance('prop1');

      expect(result.overallStatus).toBe('COMPLETE');
      expect(result.missingSections).toHaveLength(0);
      expect(result.emptySections).toHaveLength(0);
      expect(result.limitViolations).toHaveLength(0);
    });

    it('should detect empty required sections', async () => {
      const mockProposal = {
        id: 'prop1',
        parsedRequirements: null,
        sections: [
          {
            id: 'sec1',
            sectionName: 'Executive Summary',
            content: '', // Empty
            isRequired: true,
            wordLimit: null,
            charLimit: null
          }
        ]
      };

      vi.mocked(prisma.proposal.findUnique).mockResolvedValue(mockProposal as any);

      const result = await checker.checkCompliance('prop1');

      expect(result.overallStatus).toBe('VIOLATIONS');
      expect(result.emptySections).toContain('Executive Summary');
    });

    it('should detect word limit violations', async () => {
      const longContent = Array(200).fill('word').join(' '); // 200 words
      const mockProposal = {
        id: 'prop1',
        parsedRequirements: null,
        sections: [
          {
            id: 'sec1',
            sectionName: 'Executive Summary',
            content: `<p>${longContent}</p>`,
            isRequired: true,
            wordLimit: 100, // Limit is 100, content is 200 (100% over)
            charLimit: null
          }
        ]
      };

      vi.mocked(prisma.proposal.findUnique).mockResolvedValue(mockProposal as any);

      const result = await checker.checkCompliance('prop1');

      expect(result.limitViolations).toHaveLength(1);
      expect(result.limitViolations[0].sectionName).toBe('Executive Summary');
      expect(result.limitViolations[0].limitType).toBe('WORD');
      expect(result.limitViolations[0].overagePercent).toBeGreaterThan(ENFORCEMENT_THRESHOLDS.WORD_LIMIT_BLOCK_PERCENT);
    });

    it('should classify blocking vs warning violations correctly', async () => {
      const checker = new ComplianceChecker();
      
      const blockingViolation = { overagePercent: 15 }; // > 10%
      const warningViolation = { overagePercent: 5 };   // <= 10%

      const complianceWithBlocking = {
        limitViolations: [blockingViolation as any]
      };

      const complianceWithWarning = {
        limitViolations: [warningViolation as any]
      };

      expect(checker.getBlockingViolations(complianceWithBlocking as any)).toHaveLength(1);
      expect(checker.getBlockingViolations(complianceWithWarning as any)).toHaveLength(0);
      expect(checker.getWarningViolations(complianceWithWarning as any)).toHaveLength(1);
    });
  });
});
