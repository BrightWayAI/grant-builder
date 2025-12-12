import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";

// Get/update digest preferences
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let preference = await prisma.grantDigestPreference.findUnique({
      where: { organizationId: user.organizationId },
    });

    if (!preference) {
      preference = await prisma.grantDigestPreference.create({
        data: {
          organizationId: user.organizationId,
          enabled: true,
        },
      });
    }

    return NextResponse.json(preference);
  } catch (error) {
    console.error("Error fetching digest preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { enabled } = body;

    const preference = await prisma.grantDigestPreference.upsert({
      where: { organizationId: user.organizationId },
      update: { enabled },
      create: {
        organizationId: user.organizationId,
        enabled,
      },
    });

    return NextResponse.json(preference);
  } catch (error) {
    console.error("Error updating digest preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
