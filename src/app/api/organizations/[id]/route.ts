import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import prisma from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { organizationId } = await requireOrganization();

    if (organizationId !== params.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { name, ein, mission, geographicFocus, budgetRange, populationsServed, programAreas, orgType, fundingMin, fundingMax } = body;

    const updated = await prisma.organization.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(ein !== undefined && { ein: ein || null }),
        ...(mission !== undefined && { mission: mission || null }),
        ...(geographicFocus !== undefined && { geographicFocus }),
        ...(budgetRange !== undefined && { budgetRange: budgetRange || null }),
        ...(populationsServed !== undefined && { populationsServed: populationsServed || null }),
        ...(programAreas !== undefined && { programAreas }),
        ...(orgType !== undefined && { orgType: orgType || null }),
        ...(fundingMin !== undefined && { fundingMin: fundingMin || null }),
        ...(fundingMax !== undefined && { fundingMax: fundingMax || null }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Organization update error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
  }
}
