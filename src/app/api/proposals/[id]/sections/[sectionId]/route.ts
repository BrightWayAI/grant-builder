import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import prisma from "@/lib/db";
import { citationMapper } from "@/lib/enforcement/citation-mapper";
import { claimVerifier } from "@/lib/enforcement/claim-verifier";
import { placeholderDetector } from "@/lib/enforcement/placeholder-detector";
import { scoreAndPersistSection } from "@/lib/enforcement/voice-profile";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; sectionId: string } }
) {
  try {
    const { organizationId } = await requireOrganization();

    const proposal = await prisma.proposal.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const section = await prisma.proposalSection.findFirst({
      where: {
        id: params.sectionId,
        proposalId: params.id,
      },
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    const body = await request.json();
    const { content, generatedContent, skipEnforcement } = body;

    const updated = await prisma.proposalSection.update({
      where: { id: params.sectionId },
      data: {
        ...(content !== undefined && { content }),
        ...(generatedContent !== undefined && { generatedContent }),
      },
    });

    await prisma.proposal.update({
      where: { id: params.id },
      data: { updatedAt: new Date() },
    });

    // Run enforcement pipeline on content save (synchronous - must complete)
    if (content && !skipEnforcement) {
      try {
        // 1. Citation mapping - compute source coverage
        await citationMapper.mapAndPersist({
          sectionId: params.sectionId,
          generatedText: content,
          retrievedChunks: [], // Will fetch fresh chunks
          organizationId
        });

        // 2. Claim verification - extract and verify factual claims
        await claimVerifier.extractAndVerifyProposal(params.id, organizationId);

        // 3. Placeholder detection - scan for missing data markers
        await placeholderDetector.scanAndPersistPlaceholders(params.id);
        
        // 4. Voice scoring - evaluate against org voice profile (AC-3.2)
        await scoreAndPersistSection(params.sectionId, content, organizationId);
      } catch (enforcementError) {
        // Log but don't fail the request - enforcement data will be checked at export
        console.error('Enforcement pipeline error:', enforcementError);
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
  }
}
