import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(
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
        organization: {
          select: {
            name: true,
            mission: true,
            geography: true,
          },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    return NextResponse.json(proposal);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch proposal" }, { status: 500 });
  }
}

export async function PATCH(
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
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, funderName, programTitle, deadline, status } = body;

    const updated = await prisma.proposal.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(funderName !== undefined && { funderName }),
        ...(programTitle !== undefined && { programTitle }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(status && { status }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update proposal" }, { status: 500 });
  }
}

export async function DELETE(
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
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    await prisma.proposal.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to delete proposal" }, { status: 500 });
  }
}
