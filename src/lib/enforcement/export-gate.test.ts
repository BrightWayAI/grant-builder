/**
 * Export Gate Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ENFORCEMENT_THRESHOLDS } from './thresholds';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  default: {
    proposalSection: { findMany: vi.fn() },
    verifiedClaim: { findMany: vi.fn() },
    ambiguityFlagRecord: { findMany: vi.fn() },
    exportAuditLog: { create: vi.fn() }
  }
}));

vi.mock('./compliance-checker', () => ({
  complianceChecker: {
    checkCompliance: vi.fn()
  }
}));

vi.mock('./placeholder-detector', () => ({
  placeholderDetector: {
    getPlaceholderSummary: vi.fn()
  }
}));

import prisma from '@/lib/db';
import { complianceChecker } from './compliance-checker';
import { placeholderDetector } from './placeholder-detector';
import { ExportGatekeeper } from './export-gate';

describe('ExportGatekeeper', () => {
  const gatekeeper = new ExportGatekeeper();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks that allow export
    vi.mocked(complianceChecker.checkCompliance).mockResolvedValue({
      proposalId: 'prop1',
      overallStatus: 'COMPLETE',
      requiredSections: [],
      missingSections: [],
      emptySections: [],
      limitViolations: [],
      complianceScore: 100,
      checkedAt: new Date()
    });

    vi.mocked(placeholderDetector.getPlaceholderSummary).mockResolvedValue({
      proposalId: 'prop1',
      total: 0,
      unresolved: 0,
      byType: { MISSING_DATA: 0, USER_INPUT_REQUIRED: 0, VERIFICATION_NEEDED: 0 },
      placeholders: []
    });

    vi.mocked(prisma.proposalSection.findMany).mockResolvedValue([]);
    vi.mocked(prisma.verifiedClaim.findMany).mockResolvedValue([]);
    vi.mocked(prisma.ambiguityFlagRecord.findMany).mockResolvedValue([]);
    vi.mocked(prisma.exportAuditLog.create).mockResolvedValue({ id: 'audit1' } as any);
  });

  describe('evaluate', () => {
    it('should ALLOW export when all checks pass', async () => {
      const { gateResult } = await gatekeeper.evaluate('prop1', 'user1', 'DOCX');

      expect(gateResult.allowed).toBe(true);
      expect(gateResult.decision).toBe('ALLOW');
      expect(gateResult.blocks).toHaveLength(0);
      expect(gateResult.warnings).toHaveLength(0);
    });

    it('should BLOCK export when required sections are missing', async () => {
      vi.mocked(complianceChecker.checkCompliance).mockResolvedValue({
        proposalId: 'prop1',
        overallStatus: 'VIOLATIONS',
        requiredSections: [],
        missingSections: ['Executive Summary'],
        emptySections: [],
        limitViolations: [],
        complianceScore: 50,
        checkedAt: new Date()
      });

      const { gateResult } = await gatekeeper.evaluate('prop1', 'user1', 'DOCX');

      expect(gateResult.allowed).toBe(false);
      expect(gateResult.decision).toBe('BLOCK');
      expect(gateResult.blocks.some(b => b.ruleId === 'REQUIRED_SECTION_MISSING')).toBe(true);
    });

    it('should BLOCK export when required sections are empty', async () => {
      vi.mocked(complianceChecker.checkCompliance).mockResolvedValue({
        proposalId: 'prop1',
        overallStatus: 'VIOLATIONS',
        requiredSections: [],
        missingSections: [],
        emptySections: ['Statement of Need'],
        limitViolations: [],
        complianceScore: 50,
        checkedAt: new Date()
      });

      const { gateResult } = await gatekeeper.evaluate('prop1', 'user1', 'DOCX');

      expect(gateResult.allowed).toBe(false);
      expect(gateResult.decision).toBe('BLOCK');
      expect(gateResult.blocks.some(b => b.ruleId === 'REQUIRED_SECTION_EMPTY')).toBe(true);
    });

    it('should BLOCK export when word limit exceeded by >10%', async () => {
      vi.mocked(complianceChecker.checkCompliance).mockResolvedValue({
        proposalId: 'prop1',
        overallStatus: 'VIOLATIONS',
        requiredSections: [],
        missingSections: [],
        emptySections: [],
        limitViolations: [{
          sectionId: 'sec1',
          sectionName: 'Executive Summary',
          limitType: 'WORD',
          limit: 100,
          actual: 150,
          overagePercent: 50 // Way over
        }],
        complianceScore: 50,
        checkedAt: new Date()
      });

      const { gateResult } = await gatekeeper.evaluate('prop1', 'user1', 'DOCX');

      expect(gateResult.allowed).toBe(false);
      expect(gateResult.decision).toBe('BLOCK');
      expect(gateResult.blocks.some(b => b.ruleId === 'WORD_LIMIT_CRITICAL')).toBe(true);
    });

    it('should BLOCK export when unresolved placeholders exist', async () => {
      vi.mocked(placeholderDetector.getPlaceholderSummary).mockResolvedValue({
        proposalId: 'prop1',
        total: 2,
        unresolved: 2,
        byType: { MISSING_DATA: 1, USER_INPUT_REQUIRED: 1, VERIFICATION_NEEDED: 0 },
        placeholders: []
      });

      const { gateResult } = await gatekeeper.evaluate('prop1', 'user1', 'DOCX');

      expect(gateResult.allowed).toBe(false);
      expect(gateResult.decision).toBe('BLOCK');
      expect(gateResult.blocks.some(b => b.ruleId === 'UNRESOLVED_PLACEHOLDER')).toBe(true);
    });

    it('should BLOCK export when unresolved ambiguities require user input', async () => {
      vi.mocked(prisma.ambiguityFlagRecord.findMany).mockResolvedValue([
        {
          id: 'amb1',
          proposalId: 'prop1',
          ambiguityType: 'CONTRADICTORY',
          description: 'Conflicting requirements',
          sourceTexts: [],
          suggestedResolutions: [],
          requiresUserInput: true,
          resolved: false,
          resolution: null,
          resolvedBy: null,
          resolvedAt: null,
          createdAt: new Date()
        }
      ] as any);

      const { gateResult } = await gatekeeper.evaluate('prop1', 'user1', 'DOCX');

      expect(gateResult.allowed).toBe(false);
      expect(gateResult.decision).toBe('BLOCK');
      expect(gateResult.blocks.some(b => b.ruleId === 'UNRESOLVED_AMBIGUITY')).toBe(true);
    });

    it('should BLOCK export when high-risk claims are unverified', async () => {
      vi.mocked(prisma.verifiedClaim.findMany).mockResolvedValue([
        {
          id: 'claim1',
          paragraphId: 'para1',
          claimType: 'PERCENTAGE',
          value: '85%',
          context: 'We achieved 85% success rate',
          positionStart: 0,
          positionEnd: 3,
          riskLevel: 'HIGH',
          status: 'UNVERIFIED',
          verificationScore: 0,
          evidence: [],
          createdAt: new Date()
        }
      ] as any);

      const { gateResult } = await gatekeeper.evaluate('prop1', 'user1', 'DOCX');

      expect(gateResult.allowed).toBe(false);
      expect(gateResult.decision).toBe('BLOCK');
      expect(gateResult.blocks.some(b => b.ruleId === 'HIGH_RISK_UNVERIFIED')).toBe(true);
    });

    it('should WARN when coverage is low but above critical threshold', async () => {
      vi.mocked(prisma.proposalSection.findMany).mockResolvedValue([
        {
          id: 'sec1',
          coverageRecord: {
            sectionId: 'sec1',
            coverageScore: 40, // Between 30-50%
            groundedCount: 2,
            partialCount: 2,
            ungroundedCount: 6,
            totalParagraphs: 10,
            sourceDocuments: [],
            computedAt: new Date()
          }
        }
      ] as any);

      const { gateResult } = await gatekeeper.evaluate('prop1', 'user1', 'DOCX');

      expect(gateResult.allowed).toBe(true);
      expect(gateResult.decision).toBe('WARN');
      expect(gateResult.warnings.some(w => w.ruleId === 'COVERAGE_LOW')).toBe(true);
      expect(gateResult.attestationRequired).toBe(true);
    });

    it('should BLOCK export when coverage is below critical threshold', async () => {
      vi.mocked(prisma.proposalSection.findMany).mockResolvedValue([
        {
          id: 'sec1',
          coverageRecord: {
            sectionId: 'sec1',
            coverageScore: 20, // Below 30%
            groundedCount: 1,
            partialCount: 1,
            ungroundedCount: 8,
            totalParagraphs: 10,
            sourceDocuments: [],
            computedAt: new Date()
          }
        }
      ] as any);

      const { gateResult } = await gatekeeper.evaluate('prop1', 'user1', 'DOCX');

      expect(gateResult.allowed).toBe(false);
      expect(gateResult.decision).toBe('BLOCK');
      expect(gateResult.blocks.some(b => b.ruleId === 'COVERAGE_CRITICAL')).toBe(true);
    });

    it('should create audit record for every evaluation', async () => {
      await gatekeeper.evaluate('prop1', 'user1', 'DOCX');

      expect(prisma.exportAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            proposalId: 'prop1',
            userId: 'user1',
            exportFormat: 'DOCX'
          })
        })
      );
    });

    it('should BLOCK export when enforcement data cannot be loaded (fail closed)', async () => {
      vi.mocked(complianceChecker.checkCompliance).mockRejectedValue(new Error('DB Error'));

      const { gateResult } = await gatekeeper.evaluate('prop1', 'user1', 'DOCX');

      expect(gateResult.allowed).toBe(false);
      expect(gateResult.decision).toBe('BLOCK');
      expect(gateResult.blocks.some(b => b.ruleId === 'ENFORCEMENT_FAILURE')).toBe(true);
    });
  });
});
