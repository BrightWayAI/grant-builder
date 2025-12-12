import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const savedGrants = await prisma.savedGrant.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { savedAt: "desc" },
    });

    return NextResponse.json({ grants: savedGrants });
  } catch (error) {
    console.error("Error fetching saved grants:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved grants" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      grantId,
      title,
      funderName,
      deadline,
      awardFloor,
      awardCeiling,
      description,
      eligibleTypes,
      categories,
      matchScore,
    } = body;

    const savedGrant = await prisma.savedGrant.create({
      data: {
        organizationId: user.organizationId,
        grantId,
        title,
        funderName,
        deadline: deadline ? new Date(deadline) : null,
        awardFloor,
        awardCeiling,
        description,
        eligibleTypes: eligibleTypes || [],
        categories: categories || [],
        matchScore: matchScore || 0,
      },
    });

    return NextResponse.json(savedGrant);
  } catch (error) {
    console.error("Error saving grant:", error);
    
    // Check for unique constraint violation
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Grant already saved" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to save grant" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const grantId = searchParams.get("grantId");

    if (!grantId) {
      return NextResponse.json({ error: "Grant ID required" }, { status: 400 });
    }

    await prisma.savedGrant.delete({
      where: {
        organizationId_grantId: {
          organizationId: user.organizationId,
          grantId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing saved grant:", error);
    return NextResponse.json(
      { error: "Failed to remove grant" },
      { status: 500 }
    );
  }
}
