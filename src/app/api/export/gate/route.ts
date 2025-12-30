/**
 * Export Gate API
 * 
 * POST /api/export/gate
 * Evaluates export gate for a proposal and returns decision.
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
      }
    });

    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // Scan for placeholders before gate evaluation
    await placeholderDetector.scanAndPersistPlaceholders(proposalId);

    // Evaluate export gate
    const { gateResult, auditRecord } = await exportGatekeeper.evaluate(
      proposalId,
      userId,
      exportFormat
    );

    // Get enforcement data for display
    const [compliance, placeholders] = await Promise.all([
      complianceChecker.checkCompliance(proposalId),
      placeholderDetector.getPlaceholderSummary(proposalId)
    ]);

    return NextResponse.json({
      gateResult,
      auditRecordId: auditRecord.id,
      enforcement: {
        compliance,
        placeholders,
        coverage: null, // Will be populated when coverage scorer is implemented
        claims: null    // Will be populated when claim verifier is implemented
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
