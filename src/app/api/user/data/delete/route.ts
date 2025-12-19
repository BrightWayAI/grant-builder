import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { audit } from "@/lib/audit";
import bcrypt from "bcryptjs";

// POST: Delete user account and all associated data (GDPR/CCPA compliance)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { password, confirmation } = await request.json();

    // Require explicit confirmation
    if (confirmation !== "DELETE MY ACCOUNT") {
      return NextResponse.json(
        { error: "Please type 'DELETE MY ACCOUNT' to confirm" },
        { status: 400 }
      );
    }

    // Verify password for users with password auth
    if (user.passwordHash) {
      if (!password) {
        return NextResponse.json(
          { error: "Password is required to delete account" },
          { status: 400 }
        );
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid password" },
          { status: 401 }
        );
      }
    }

    // Log the deletion before it happens (outside transaction for audit trail)
    await audit({
      userId: user.id,
      userEmail: user.email,
      organizationId: user.organizationId || undefined,
      action: "DATA_DELETED",
      description: `User ${user.email} requested account deletion`,
    });

    // Use transaction for atomic deletion
    await prisma.$transaction(async (tx) => {
      // Delete user's feedback
      await tx.feedback.deleteMany({
        where: { userId: user.id },
      });

      // Delete login attempts
      await tx.loginAttempt.deleteMany({
        where: { email: user.email },
      });

      // Delete OAuth accounts
      await tx.account.deleteMany({
        where: { userId: user.id },
      });

      // Delete sessions
      await tx.session.deleteMany({
        where: { userId: user.id },
      });

      // Check if user is the only member of their organization
      if (user.organizationId) {
        const orgMemberCount = await tx.user.count({
          where: { organizationId: user.organizationId },
        });

        // If last member, delete the entire organization and its data
        if (orgMemberCount === 1) {
          // Delete organization's saved grants
          await tx.savedGrant.deleteMany({
            where: { organizationId: user.organizationId },
          });

          // Delete grant digest preferences
          await tx.grantDigestPreference.deleteMany({
            where: { organizationId: user.organizationId },
          });

          // Delete proposal sections first (due to FK constraints)
          const proposals = await tx.proposal.findMany({
            where: { organizationId: user.organizationId },
            select: { id: true },
          });
          for (const proposal of proposals) {
            await tx.proposalSection.deleteMany({
              where: { proposalId: proposal.id },
            });
          }

          // Delete proposals
          await tx.proposal.deleteMany({
            where: { organizationId: user.organizationId },
          });

          // Delete document chunks first
          const documents = await tx.document.findMany({
            where: { organizationId: user.organizationId },
            select: { id: true },
          });
          for (const doc of documents) {
            await tx.documentChunk.deleteMany({
              where: { documentId: doc.id },
            });
          }

          // Delete documents
          await tx.document.deleteMany({
            where: { organizationId: user.organizationId },
          });

          // Delete organization feedback
          await tx.feedback.deleteMany({
            where: { organizationId: user.organizationId },
          });

          // Delete organization
          await tx.organization.delete({
            where: { id: user.organizationId },
          });
        }
      }

      // Finally, delete the user
      await tx.user.delete({
        where: { id: user.id },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Your account and all associated data have been deleted.",
    });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
