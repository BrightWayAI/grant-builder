/**
 * Export Gate API
 * 
 * POST /api/export/gate
 * Evaluates export gate for a proposal and returns decision.
 * Runs full enforcement pipeline to ensure all checks are current.
 * 
 * Request: { proposalId: string, exportFormat: 'DOCX' | 'PDF' | 'CLIPBOARD' }
 * Response: { gateResult: ExportGateResult, enforcement: EnforcementData }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrganization } from '@/lib/auth';
import prisma from '@/lib/db';
import { exportGatekeeper } from '@/lib/enforcement/export-gate';
import { complianceChecker } from '@/lib/enforcement/compliance-checker';
import { placeholderDetector } from '@/lib/enforcement/placeholder-detector';
import { citationMapper } from '@/lib/enforcement/citation-mapper';
import { claimVerifier } from '@/lib/enforcement/claim-verifier';
import { coverageScorer } from '@/lib/enforcement/coverage-scorer';

export async function POST(request: NextRequest) {
  try {
    const { organizationId, user } = await requireOrganization();
    const userId = user.id;

    const body = await request.json();
    const { proposalId, exportFormat = 'DOCX' } = body;

    if (!proposalId) {
      return NextResponse.json(
        { error: 'proposalId is required' },
        { status: 400 }
      );
    }

    // Verify proposal belongs to organization
    const proposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        organizationId
      },
      include: {
        sections: true
      }
    });

    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // Run full enforcement pipeline before gate evaluation (AC-5.3)
    // This ensures all enforcement data is current, even if not run during save
    try {
      // 1. Scan for placeholders (AC-1.2)
      await placeholderDetector.scanAndPersistPlaceholders(proposalId);

      // 2. Run citation mapping for all sections with content (AC-1.1, AC-1.4, AC-1.5)
      for (const section of proposal.sections) {
        if (section.content && section.content.trim().length > 0) {
          await citationMapper.mapAndPersist({
            sectionId: section.id,
            generatedText: section.content,
            retrievedChunks: [],
            organizationId
          });
        }
      }

      // 3. Run claim verification (AC-1.3)
      await claimVerifier.extractAndVerifyProposal(proposalId, organizationId);

    } catch (enforcementError) {
      console.error('Pre-export enforcement pipeline error:', enforcementError);
      // Continue to gate evaluation - fail-closed will handle missing data
    }

    // Evaluate export gate
    const { gateResult, auditRecord } = await exportGatekeeper.evaluate(
      proposalId,
      userId,
      exportFormat
    );

    // Get enforcement data for display
    const [compliance, placeholders, coverage, claims] = await Promise.all([
      complianceChecker.checkCompliance(proposalId),
      placeholderDetector.getPlaceholderSummary(proposalId),
      coverageScorer.computeProposalCoverage(proposalId),
      claimVerifier.getVerificationSummary(proposalId)
    ]);

    return NextResponse.json({
      gateResult,
      auditRecordId: auditRecord.id,
      enforcement: {
        compliance,
        placeholders,
        coverage,
        claims
      }
    });
  } catch (error) {
    console.error('Export gate error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to evaluate export gate' },
      { status: 500 }
    );
  }
}
