/**
 * Export Gatekeeper
 * 
 * Single decision point for export blocking/warning.
 * Evaluates all enforcement data and returns a gate result.
 * 
 * FAIL CLOSED: If any enforcement data cannot be loaded, BLOCK export.
 */

import prisma from '@/lib/db';
import { 
  ExportGateResult,
  ExportBlock,
  ExportWarning,
  ExportDecision,
  EnforcementData,
  EnforcementSnapshot,
  ExportAuditRecord,
  ProposalCoverage,
  ClaimVerificationSummary,
  ComplianceStatus,
  PlaceholderSummary,
  AmbiguitySummary
} from '@/types/enforcement';
import { ENFORCEMENT_THRESHOLDS } from './thresholds';
import { complianceChecker } from './compliance-checker';
import { placeholderDetector } from './placeholder-detector';

interface ExportRule {
  id: string;
  ac: string;
  check: (data: EnforcementData) => boolean;
  action: 'BLOCK' | 'WARN';
  severity?: 'LOW' | 'MEDIUM' | 'HIGH';
  message: (data: EnforcementData) => string;
  resolution?: string;
  getAffectedItems?: (data: EnforcementData) => string[];
}

const EXPORT_RULES: ExportRule[] = [
  // BLOCK rules - cannot be overridden
  {
    id: 'HIGH_RISK_UNVERIFIED',
    ac: 'AC-1.3',
    check: (data) => (data.claims?.highRiskUnverified || 0) > 0,
    action: 'BLOCK',
    message: (data) => `${data.claims?.highRiskUnverified || 0} high-risk claims are unverified (statistics, dollar amounts, outcomes, or partner names)`,
    resolution: 'Verify or remove unverified high-risk claims by adding supporting documents or editing the content',
    getAffectedItems: (data) => data.claims?.claims
      .filter(c => c.riskLevel === 'HIGH' && c.status === 'UNVERIFIED')
      .map(c => c.value) || []
  },
  {
    id: 'COVERAGE_CRITICAL',
    ac: 'AC-1.5',
    check: (data) => data.coverage !== null && data.coverage.overallScore < ENFORCEMENT_THRESHOLDS.COVERAGE_BLOCK,
    action: 'BLOCK',
    message: (data) => `Source coverage is critically low (${data.coverage?.overallScore || 0}%). Minimum required: ${ENFORCEMENT_THRESHOLDS.COVERAGE_BLOCK}%`,
    resolution: 'Add more source documents to your knowledge base or review AI-generated content for accuracy',
    getAffectedItems: (data) => data.coverage?.sectionScores
      .filter(s => s.coverageScore < ENFORCEMENT_THRESHOLDS.COVERAGE_BLOCK)
      .map(s => s.sectionName) || []
  },
  {
    id: 'REQUIRED_SECTION_MISSING',
    ac: 'AC-2.3',
    check: (data) => (data.compliance?.missingSections.length || 0) > 0,
    action: 'BLOCK',
    message: (data) => `Required sections are missing: ${data.compliance?.missingSections.join(', ')}`,
    resolution: 'Add the missing required sections to your proposal',
    getAffectedItems: (data) => data.compliance?.missingSections || []
  },
  {
    id: 'REQUIRED_SECTION_EMPTY',
    ac: 'AC-2.3',
    check: (data) => (data.compliance?.emptySections.length || 0) > 0,
    action: 'BLOCK',
    message: (data) => `Required sections are empty or too short: ${data.compliance?.emptySections.join(', ')}`,
    resolution: 'Add content to the empty required sections',
    getAffectedItems: (data) => data.compliance?.emptySections || []
  },
  {
    id: 'WORD_LIMIT_CRITICAL',
    ac: 'AC-2.3',
    check: (data) => {
      const violations = data.compliance?.limitViolations || [];
      return violations.some(v => v.overagePercent > ENFORCEMENT_THRESHOLDS.WORD_LIMIT_BLOCK_PERCENT);
    },
    action: 'BLOCK',
    message: (data) => {
      const violations = data.compliance?.limitViolations.filter(
        v => v.overagePercent > ENFORCEMENT_THRESHOLDS.WORD_LIMIT_BLOCK_PERCENT
      ) || [];
      return `Word/character limits exceeded by more than ${ENFORCEMENT_THRESHOLDS.WORD_LIMIT_BLOCK_PERCENT}%: ${violations.map(v => `${v.sectionName} (${v.overagePercent}% over)`).join(', ')}`;
    },
    resolution: 'Reduce the content length in the affected sections to meet the limits',
    getAffectedItems: (data) => data.compliance?.limitViolations
      .filter(v => v.overagePercent > ENFORCEMENT_THRESHOLDS.WORD_LIMIT_BLOCK_PERCENT)
      .map(v => v.sectionName) || []
  },
  {
    id: 'UNRESOLVED_PLACEHOLDER',
    ac: 'AC-1.2',
    check: (data) => {
      if (!data.placeholders) return false;
      const blocking = data.placeholders.byType['MISSING_DATA'] + data.placeholders.byType['USER_INPUT_REQUIRED'];
      return blocking > 0;
    },
    action: 'BLOCK',
    message: (data) => {
      const blocking = (data.placeholders?.byType['MISSING_DATA'] || 0) + 
                       (data.placeholders?.byType['USER_INPUT_REQUIRED'] || 0);
      return `${blocking} placeholder(s) require resolution before export`;
    },
    resolution: 'Complete all placeholder sections by providing the required information',
    getAffectedItems: (data) => data.placeholders?.placeholders
      .filter(p => !p.resolved && (p.type === 'MISSING_DATA' || p.type === 'USER_INPUT_REQUIRED'))
      .map(p => p.description) || []
  },
  {
    id: 'UNRESOLVED_AMBIGUITY',
    ac: 'AC-2.4',
    check: (data) => {
      if (!data.ambiguities) return false;
      return data.ambiguities.ambiguities.some(a => a.requiresUserInput && !a.resolved);
    },
    action: 'BLOCK',
    message: () => 'RFP ambiguities require resolution before export',
    resolution: 'Review and resolve the flagged ambiguities in the RFP requirements',
    getAffectedItems: (data) => data.ambiguities?.ambiguities
      .filter(a => a.requiresUserInput && !a.resolved)
      .map(a => a.description) || []
  },
  {
    id: 'ENFORCEMENT_FAILURE_FLAG',
    ac: 'AC-5.3',
    check: (data) => data.enforcementFailure === true,
    action: 'BLOCK',
    message: () => 'Enforcement validation failed during generation. Some content may not have been verified.',
    resolution: 'Regenerate the affected sections or manually verify all claims and statistics',
    getAffectedItems: () => ['Proposal enforcement validation']
  },
  {
    id: 'NULL_COVERAGE_DATA',
    ac: 'AC-5.3',
    check: (data) => data.coverage === null && data.hasGeneratedContent === true,
    action: 'BLOCK',
    message: () => 'Source coverage could not be computed. Export blocked for safety.',
    resolution: 'Refresh the proposal page to trigger coverage computation, or regenerate sections',
    getAffectedItems: () => ['Coverage validation']
  },
  {
    id: 'GENERIC_KNOWLEDGE_CONTENT',
    ac: 'AC-4.4',
    check: (data) => {
      if (!data.sectionsWithGenericKnowledge) return false;
      return data.sectionsWithGenericKnowledge.length > 0;
    },
    action: 'BLOCK',
    message: (data) => `${data.sectionsWithGenericKnowledge?.length || 0} section(s) were generated without supporting sources`,
    resolution: 'Upload relevant documents to your knowledge base and regenerate these sections',
    getAffectedItems: (data) => data.sectionsWithGenericKnowledge || []
  },

  // WARN rules - can be overridden with attestation
  {
    id: 'COVERAGE_LOW',
    ac: 'AC-1.5',
    check: (data) => {
      if (!data.coverage) return false;
      return data.coverage.overallScore >= ENFORCEMENT_THRESHOLDS.COVERAGE_BLOCK && 
             data.coverage.overallScore < ENFORCEMENT_THRESHOLDS.COVERAGE_WARN;
    },
    action: 'WARN',
    severity: 'HIGH',
    message: (data) => `Source coverage is low (${data.coverage?.overallScore || 0}%). Recommended: ${ENFORCEMENT_THRESHOLDS.COVERAGE_WARN}%+`,
    getAffectedItems: (data) => data.coverage?.sectionScores
      .filter(s => s.coverageScore < ENFORCEMENT_THRESHOLDS.COVERAGE_WARN)
      .map(s => s.sectionName) || []
  },
  {
    id: 'UNVERIFIED_MEDIUM_CLAIMS',
    ac: 'AC-1.3',
    check: (data) => {
      if (!data.claims) return false;
      const mediumUnverified = data.claims.claims.filter(
        c => c.riskLevel === 'MEDIUM' && c.status === 'UNVERIFIED'
      ).length;
      return mediumUnverified > 0;
    },
    action: 'WARN',
    severity: 'MEDIUM',
    message: (data) => {
      const count = data.claims?.claims.filter(
        c => c.riskLevel === 'MEDIUM' && c.status === 'UNVERIFIED'
      ).length || 0;
      return `${count} medium-risk claim(s) could not be verified against your knowledge base`;
    },
    getAffectedItems: (data) => data.claims?.claims
      .filter(c => c.riskLevel === 'MEDIUM' && c.status === 'UNVERIFIED')
      .map(c => c.value) || []
  },
  {
    id: 'WORD_LIMIT_WARN',
    ac: 'AC-2.3',
    check: (data) => {
      const violations = data.compliance?.limitViolations || [];
      return violations.some(
        v => v.overagePercent > ENFORCEMENT_THRESHOLDS.WORD_LIMIT_WARN_PERCENT && 
             v.overagePercent <= ENFORCEMENT_THRESHOLDS.WORD_LIMIT_BLOCK_PERCENT
      );
    },
    action: 'WARN',
    severity: 'LOW',
    message: (data) => {
      const violations = data.compliance?.limitViolations.filter(
        v => v.overagePercent > ENFORCEMENT_THRESHOLDS.WORD_LIMIT_WARN_PERCENT && 
             v.overagePercent <= ENFORCEMENT_THRESHOLDS.WORD_LIMIT_BLOCK_PERCENT
      ) || [];
      return `Word/character limits slightly exceeded: ${violations.map(v => `${v.sectionName} (${v.overagePercent}% over)`).join(', ')}`;
    },
    getAffectedItems: (data) => data.compliance?.limitViolations
      .filter(v => v.overagePercent > ENFORCEMENT_THRESHOLDS.WORD_LIMIT_WARN_PERCENT && 
                   v.overagePercent <= ENFORCEMENT_THRESHOLDS.WORD_LIMIT_BLOCK_PERCENT)
      .map(v => v.sectionName) || []
  },
  {
    id: 'VERIFICATION_PLACEHOLDERS',
    ac: 'AC-1.2',
    check: (data) => {
      if (!data.placeholders) return false;
      return data.placeholders.byType['VERIFICATION_NEEDED'] > ENFORCEMENT_THRESHOLDS.MAX_VERIFICATION_PLACEHOLDERS;
    },
    action: 'WARN',
    severity: 'LOW',
    message: (data) => `${data.placeholders?.byType['VERIFICATION_NEEDED'] || 0} sections are marked for verification`,
    getAffectedItems: (data) => data.placeholders?.placeholders
      .filter(p => !p.resolved && p.type === 'VERIFICATION_NEEDED')
      .map(p => p.description) || []
  }
];

export class ExportGatekeeper {
  /**
   * Evaluate export gate for a proposal
   * FAIL CLOSED: If data loading fails, block export
   */
  async evaluate(
    proposalId: string,
    userId: string,
    exportFormat: 'DOCX' | 'PDF' | 'CLIPBOARD'
  ): Promise<{ gateResult: ExportGateResult; auditRecord: ExportAuditRecord }> {
    let enforcementData: EnforcementData;
    
    try {
      enforcementData = await this.gatherEnforcementData(proposalId);
    } catch (error) {
      // FAIL CLOSED: If we can't gather data, block export
      console.error('Failed to gather enforcement data:', error);
      
      const failedResult: ExportGateResult = {
        allowed: false,
        decision: 'BLOCK',
        blocks: [{
          ruleId: 'ENFORCEMENT_FAILURE',
          ac: 'AC-5.3',
          reason: 'Could not verify proposal compliance. Please try again.',
          affectedItems: [],
          resolution: 'Refresh the page and try exporting again. If the problem persists, contact support.'
        }],
        warnings: [],
        attestationRequired: false
      };

      const auditRecord = await this.createAuditRecord(
        proposalId,
        userId,
        exportFormat,
        failedResult,
        { coverageScore: null, verificationRate: null, complianceScore: null, voiceScore: null }
      );

      return { gateResult: failedResult, auditRecord };
    }

    // Evaluate all rules
    const blocks: ExportBlock[] = [];
    const warnings: ExportWarning[] = [];

    for (const rule of EXPORT_RULES) {
      try {
        if (rule.check(enforcementData)) {
          if (rule.action === 'BLOCK') {
            blocks.push({
              ruleId: rule.id,
              ac: rule.ac,
              reason: rule.message(enforcementData),
              affectedItems: rule.getAffectedItems?.(enforcementData) || [],
              resolution: rule.resolution || 'Review and fix the identified issues'
            });
          } else {
            warnings.push({
              ruleId: rule.id,
              ac: rule.ac,
              severity: rule.severity || 'MEDIUM',
              message: rule.message(enforcementData),
              affectedItems: rule.getAffectedItems?.(enforcementData) || []
            });
          }
        }
      } catch (error) {
        console.error(`Rule ${rule.id} evaluation failed:`, error);
        // Don't block for rule evaluation failures, but log them
      }
    }

    // Determine decision
    let decision: ExportDecision;
    if (blocks.length > 0) {
      decision = 'BLOCK';
    } else if (warnings.length > 0) {
      decision = 'WARN';
    } else {
      decision = 'ALLOW';
    }

    // Attestation required for HIGH severity warnings
    const attestationRequired = decision === 'WARN' && warnings.some(w => w.severity === 'HIGH');

    const gateResult: ExportGateResult = {
      allowed: decision !== 'BLOCK',
      decision,
      blocks,
      warnings,
      attestationRequired,
      attestationText: attestationRequired
        ? 'I have reviewed the AI-generated content and verify its accuracy for submission to the funder.'
        : undefined
    };

    // Create audit record
    const snapshot: EnforcementSnapshot = {
      coverageScore: enforcementData.coverage?.overallScore ?? null,
      verificationRate: enforcementData.claims?.verificationRate ?? null,
      complianceScore: enforcementData.compliance?.complianceScore ?? null,
      voiceScore: enforcementData.voice?.score ?? null
    };

    const auditRecord = await this.createAuditRecord(
      proposalId,
      userId,
      exportFormat,
      gateResult,
      snapshot
    );

    return { gateResult, auditRecord };
  }

  /**
   * Record attestation for a warned export
   */
  async recordAttestation(
    auditRecordId: string,
    attestationText: string
  ): Promise<void> {
    await prisma.exportAuditLog.update({
      where: { id: auditRecordId },
      data: {
        attestationText,
        attestationTimestamp: new Date()
      }
    });
  }

  /**
   * Gather all enforcement data for a proposal
   */
  private async gatherEnforcementData(proposalId: string): Promise<EnforcementData> {
    // Fetch proposal with enforcement data
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        sections: {
          select: {
            id: true,
            sectionName: true,
            content: true,
            usedGenericKnowledge: true,
            enforcementApplied: true,
          },
        },
      },
    });

    // Run compliance and placeholder checks (these are fast, synchronous with DB)
    const [compliance, placeholders, ambiguities] = await Promise.all([
      complianceChecker.checkCompliance(proposalId),
      placeholderDetector.getPlaceholderSummary(proposalId),
      this.getAmbiguitySummary(proposalId)
    ]);

    // Try to get coverage data (may not exist yet)
    const coverage = await this.getCoverageSummary(proposalId);

    // Try to get claims data (may not exist yet)
    const claims = await this.getClaimsSummary(proposalId);

    // Check for sections with generic knowledge (AC-4.4)
    const sectionsWithGenericKnowledge = proposal?.sections
      .filter(s => s.usedGenericKnowledge && s.content.trim().length > 0)
      .map(s => s.sectionName) || [];

    // Check if any sections have generated content
    const hasGeneratedContent = proposal?.sections.some(s => 
      s.content.trim().length > 0 && s.enforcementApplied
    ) || false;

    return {
      coverage,
      claims,
      compliance,
      placeholders,
      ambiguities,
      voice: null, // Voice not implemented for blocking
      // AC-5.3: Fail-closed enforcement
      enforcementFailure: proposal?.enforcementFailure || false,
      hasGeneratedContent,
      // AC-4.4: Track sections using generic knowledge
      sectionsWithGenericKnowledge,
    };
  }

  /**
   * Get coverage summary from database
   */
  private async getCoverageSummary(proposalId: string): Promise<ProposalCoverage | null> {
    const sections = await prisma.proposalSection.findMany({
      where: { proposalId },
      include: {
        coverageRecord: true
      }
    });

    const sectionScores = sections
      .filter(s => s.coverageRecord)
      .map(s => ({
        sectionId: s.id,
        sectionName: s.sectionName,
        coverageScore: s.coverageRecord!.coverageScore,
        groundedCount: s.coverageRecord!.groundedCount,
        partialCount: s.coverageRecord!.partialCount,
        ungroundedCount: s.coverageRecord!.ungroundedCount,
        totalParagraphs: s.coverageRecord!.totalParagraphs,
        sourceDocuments: s.coverageRecord!.sourceDocuments as any[],
        computedAt: s.coverageRecord!.computedAt
      }));

    if (sectionScores.length === 0) {
      return null;
    }

    const totalParagraphs = sectionScores.reduce((sum, s) => sum + s.totalParagraphs, 0);
    const groundedParagraphs = sectionScores.reduce(
      (sum, s) => sum + s.groundedCount + s.partialCount * 0.5, 
      0
    );
    const overallScore = totalParagraphs > 0 
      ? Math.round((groundedParagraphs / totalParagraphs) * 100)
      : 0;

    const lowestSection = sectionScores.length > 0
      ? sectionScores.reduce((min, s) => 
          s.coverageScore < min.score ? { name: s.sectionName, score: s.coverageScore } : min,
          { name: sectionScores[0].sectionName, score: sectionScores[0].coverageScore }
        )
      : null;

    const allDocs = new Set<string>();
    sectionScores.forEach(s => {
      (s.sourceDocuments || []).forEach((d: any) => allDocs.add(d.documentId));
    });

    return {
      proposalId,
      overallScore,
      sectionScores,
      lowestSection,
      documentsUsed: allDocs.size,
      totalParagraphs,
      groundedParagraphs: Math.round(groundedParagraphs),
      computedAt: new Date()
    };
  }

  /**
   * Get claims summary from database
   */
  private async getClaimsSummary(proposalId: string): Promise<ClaimVerificationSummary | null> {
    const claims = await prisma.verifiedClaim.findMany({
      where: {
        paragraph: {
          section: {
            proposalId
          }
        }
      }
    });

    if (claims.length === 0) {
      return null;
    }

    const verified = claims.filter(c => c.status === 'VERIFIED').length;
    const unverified = claims.filter(c => c.status === 'UNVERIFIED').length;
    const highRiskUnverified = claims.filter(
      c => c.riskLevel === 'HIGH' && c.status === 'UNVERIFIED'
    ).length;
    const conflicting = claims.filter(c => c.status === 'CONFLICTING').length;
    const outdated = claims.filter(c => c.status === 'OUTDATED').length;

    return {
      proposalId,
      totalClaims: claims.length,
      verified,
      unverified,
      highRiskUnverified,
      conflicting,
      outdated,
      verificationRate: claims.length > 0 ? Math.round((verified / claims.length) * 100) : 0,
      claims: claims.map(c => ({
        id: c.id,
        paragraphId: c.paragraphId,
        type: c.claimType as any,
        value: c.value,
        context: c.context,
        position: { start: c.positionStart, end: c.positionEnd },
        riskLevel: c.riskLevel as any,
        status: c.status as any,
        evidence: c.evidence as any[],
        verificationScore: c.verificationScore
      }))
    };
  }

  /**
   * Get ambiguity summary from database
   */
  private async getAmbiguitySummary(proposalId: string): Promise<AmbiguitySummary> {
    const records = await prisma.ambiguityFlagRecord.findMany({
      where: { proposalId }
    });

    const ambiguities = records.map(r => ({
      id: r.id,
      proposalId: r.proposalId,
      type: r.ambiguityType as any,
      description: r.description,
      sourceTexts: r.sourceTexts,
      suggestedResolutions: r.suggestedResolutions,
      requiresUserInput: r.requiresUserInput,
      resolved: r.resolved,
      resolution: r.resolution || undefined,
      resolvedBy: r.resolvedBy || undefined,
      resolvedAt: r.resolvedAt || undefined
    }));

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

  /**
   * Create audit record for export attempt
   */
  private async createAuditRecord(
    proposalId: string,
    userId: string,
    exportFormat: 'DOCX' | 'PDF' | 'CLIPBOARD',
    gateResult: ExportGateResult,
    snapshot: EnforcementSnapshot
  ): Promise<ExportAuditRecord> {
    const record = await prisma.exportAuditLog.create({
      data: {
        proposalId,
        userId,
        decision: gateResult.decision,
        exportFormat,
        blocks: JSON.parse(JSON.stringify(gateResult.blocks)),
        warnings: JSON.parse(JSON.stringify(gateResult.warnings)),
        enforcementSnapshot: JSON.parse(JSON.stringify(snapshot))
      }
    });

    return {
      id: record.id,
      proposalId: record.proposalId,
      userId: record.userId,
      timestamp: record.timestamp,
      decision: record.decision as ExportDecision,
      exportFormat: record.exportFormat as 'DOCX' | 'PDF' | 'CLIPBOARD',
      blocks: (record.blocks as unknown) as ExportBlock[],
      warnings: (record.warnings as unknown) as ExportWarning[],
      attestationText: record.attestationText || undefined,
      attestationTimestamp: record.attestationTimestamp || undefined,
      enforcementSnapshot: (record.enforcementSnapshot as unknown) as EnforcementSnapshot
    };
  }
}

// Singleton instance
export const exportGatekeeper = new ExportGatekeeper();
