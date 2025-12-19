import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { disableMfa, verifyMfa } from "@/lib/mfa";
import { audit } from "@/lib/audit";

// POST: Disable MFA (requires current MFA code)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.mfaEnabled) {
      return NextResponse.json(
        { error: "MFA is not enabled" },
        { status: 400 }
      );
    }

    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: "Verification code is required" },
        { status: 400 }
      );
    }

    // Verify current MFA code before disabling
    const isValid = await verifyMfa(user.id, code);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 401 }
      );
    }

    await disableMfa(user.id);

    await audit({
      userId: user.id,
      userEmail: user.email,
      organizationId: user.organizationId || undefined,
      action: "MFA_DISABLED",
      description: `MFA disabled for ${user.email}`,
    });

    return NextResponse.json({
      success: true,
      message: "MFA has been disabled",
    });
  } catch (error) {
    console.error("MFA disable error:", error);
    return NextResponse.json(
      { error: "Failed to disable MFA" },
      { status: 500 }
    );
  }
}
