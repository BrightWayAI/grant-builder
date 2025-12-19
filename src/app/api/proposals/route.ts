import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import prisma from "@/lib/db";
import { getSubscriptionInfo, incrementProposalCount } from "@/lib/subscription";
import { auditProposalCreated } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const { user, organizationId } = await requireOrganization();

    // Check subscription limits
    const subscription = await getSubscriptionInfo(organizationId);
    if (!subscription.canCreateProposal) {
      return NextResponse.json(
        { 
          error: "Proposal limit reached",
          code: subscription.isTrialUsed ? "TRIAL_ENDED" : "LIMIT_REACHED",
          needsPayment: subscription.needsPayment,
        }, 
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      funderName,
      programTitle,
      deadline,
      fundingAmountMin,
      fundingAmountMax,
      eligibility,
      attachments,
      submissionInstructions,
      sections,
    } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const proposal = await prisma.proposal.create({
      data: {
        organizationId,
        title,
        funderName: funderName || null,
        programTitle: programTitle || null,
        deadline: deadline ? new Date(deadline) : null,
        fundingAmountMin: fundingAmountMin || null,
        fundingAmountMax: fundingAmountMax || null,
        eligibility: eligibility || [],
        attachments: attachments || [],
        submissionInstructions: submissionInstructions || null,
        status: "DRAFT",
        sections: {
          create: (sections || []).map((section: {
            name: string;
            description?: string;
            wordLimit?: number;
            charLimit?: number;
            isRequired?: boolean;
          }, index: number) => ({
            sectionName: section.name,
            description: section.description || null,
            wordLimit: section.wordLimit || null,
            charLimit: section.charLimit || null,
            isRequired: section.isRequired ?? true,
            content: "",
            order: index,
          })),
        },
      },
      include: {
        sections: {
          orderBy: { order: "asc" },
        },
      },
    });

    // Increment proposal count for subscription tracking
    await incrementProposalCount(organizationId);

    await auditProposalCreated(proposal.id, title, organizationId, user.id, user.email || "");

    return NextResponse.json(proposal);
  } catch (error) {
    console.error("Proposal creation error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create proposal" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { organizationId } = await requireOrganization();

    const proposals = await prisma.proposal.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      include: {
        sections: {
          select: { id: true },
        },
      },
    });

    return NextResponse.json(proposals);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch proposals" }, { status: 500 });
  }
}
