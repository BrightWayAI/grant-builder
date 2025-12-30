/**
 * Export Attestation API
 * 
 * POST /api/export/attestation
 * Records user attestation for a warned export.
 * 
 * Request: { auditRecordId: string, attestationText: string }
 * Response: { success: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrganization } from '@/lib/auth';
import { exportGatekeeper } from '@/lib/enforcement/export-gate';

export async function POST(request: NextRequest) {
  try {
    await requireOrganization();

    const body = await request.json();
    const { auditRecordId, attestationText } = body;

    if (!auditRecordId || !attestationText) {
      return NextResponse.json(
        { error: 'auditRecordId and attestationText are required' },
        { status: 400 }
      );
    }

    await exportGatekeeper.recordAttestation(auditRecordId, attestationText);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Attestation error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to record attestation' },
      { status: 500 }
    );
  }
}
