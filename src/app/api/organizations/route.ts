import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      ein,
      mission,
      geography,
      budgetRange,
      populationsServed,
      programAreas,
      orgType,
      fundingMin,
      fundingMax,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        ein: ein || null,
        mission: mission || null,
        geography: geography || null,
        budgetRange: budgetRange || null,
        populationsServed: populationsServed || null,
        programAreas: programAreas || [],
        orgType: orgType || null,
        fundingMin: fundingMin || null,
        fundingMax: fundingMax || null,
        users: {
          connect: { id: session.user.id },
        },
      },
    });

    // Enable grant digest by default for new organizations
    await prisma.grantDigestPreference.create({
      data: {
        organizationId: organization.id,
        enabled: true,
      },
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { organizationId: organization.id, role: "admin" },
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.error("Organization creation error:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user?.organization) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    return NextResponse.json(user.organization);
  } catch (error) {
    console.error("Organization fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    );
  }
}
