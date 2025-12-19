import { NextRequest, NextResponse } from "next/server";
import { verifyMfa } from "@/lib/mfa";
import { audit } from "@/lib/audit";
import prisma from "@/lib/db";

// POST: Verify MFA code during login
export async function POST(request: NextRequest) {
  try {
    const { userId, code } = await request.json();

    if (!userId || !code) {
      return NextResponse.json(
        { error: "User ID and code are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, organizationId: true, mfaEnabled: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.mfaEnabled) {
      return NextResponse.json(
        { error: "MFA is not enabled for this user" },
        { status: 400 }
      );
    }

    const isValid = await verifyMfa(userId, code);

    if (!isValid) {
      await audit({
        userId: user.id,
        userEmail: user.email,
        organizationId: user.organizationId || undefined,
        action: "LOGIN_FAILED",
        description: `MFA verification failed for ${user.email}`,
      });

      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 401 }
      );
    }

    await audit({
      userId: user.id,
      userEmail: user.email,
      organizationId: user.organizationId || undefined,
      action: "MFA_VERIFIED",
      description: `MFA verified for ${user.email}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("MFA verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify MFA" },
      { status: 500 }
    );
  }
}
