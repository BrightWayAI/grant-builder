import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import prisma from "@/lib/db";
import { generateSectionDraft } from "@/lib/ai/generation";

export async function POST(
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
        },
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const body = await request.json();
    const { sectionId } = body;

    const section = proposal.sections.find((s) => s.id === sectionId);
    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    const stream = await generateSectionDraft({
      sectionName: section.sectionName,
      description: section.description || undefined,
      wordLimit: section.wordLimit || undefined,
      charLimit: section.charLimit || undefined,
      context: {
        organizationId,
        proposalId: proposal.id,
        funderName: proposal.funderName || undefined,
        programTitle: proposal.programTitle || undefined,
        fundingAmount: {
          min: proposal.fundingAmountMin || undefined,
          max: proposal.fundingAmountMax || undefined,
        },
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Generate error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to generate content" }, { status: 500 });
  }
}
