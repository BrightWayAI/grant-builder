import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateMfaSecret, generateQrCode, enableMfa } from "@/lib/mfa";
import { audit } from "@/lib/audit";

// GET: Generate new MFA secret and QR code
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.mfaEnabled) {
      return NextResponse.json(
        { error: "MFA is already enabled" },
        { status: 400 }
      );
    }

    const secret = generateMfaSecret();
    const qrCode = await generateQrCode(user.email, secret);

    return NextResponse.json({ secret, qrCode });
  } catch (error) {
    console.error("MFA setup error:", error);
    return NextResponse.json(
      { error: "Failed to generate MFA setup" },
      { status: 500 }
    );
  }
}

// POST: Enable MFA with verification
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.mfaEnabled) {
      return NextResponse.json(
        { error: "MFA is already enabled" },
        { status: 400 }
      );
    }

    const { secret, token } = await request.json();

    if (!secret || !token) {
      return NextResponse.json(
        { error: "Secret and token are required" },
        { status: 400 }
      );
    }

    const result = await enableMfa(user.id, secret, token);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await audit({
      userId: user.id,
      userEmail: user.email,
      organizationId: user.organizationId || undefined,
      action: "MFA_ENABLED",
      description: `MFA enabled for ${user.email}`,
    });

    return NextResponse.json({
      success: true,
      backupCodes: result.backupCodes,
      message: "MFA enabled successfully. Save your backup codes securely.",
    });
  } catch (error) {
    console.error("MFA enable error:", error);
    return NextResponse.json(
      { error: "Failed to enable MFA" },
      { status: 500 }
    );
  }
}
