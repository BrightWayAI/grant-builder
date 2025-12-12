import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import prisma from "@/lib/db";

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
    const { content, generatedContent } = body;

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

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
  }
}
