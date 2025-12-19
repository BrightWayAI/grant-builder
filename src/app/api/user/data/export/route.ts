import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { auditDataExported } from "@/lib/audit";

// GET: Export all user data (GDPR/CCPA compliance)
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Gather all user data
    const [
      feedback,
      auditLogs,
      loginAttempts,
    ] = await Promise.all([
      prisma.feedback.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          sentiment: true,
          message: true,
          pageUrl: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.findMany({
        where: { userId: user.id },
        select: {
          action: true,
          resourceType: true,
          description: true,
          ipAddress: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1000,
      }),
      prisma.loginAttempt.findMany({
        where: { email: user.email },
        select: {
          ipAddress: true,
          success: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    // Get organization data if user belongs to one
    let organizationData = null;
    if (user.organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: user.organizationId },
        include: {
          documents: {
            select: {
              id: true,
              filename: true,
              documentType: true,
              createdAt: true,
            },
          },
          proposals: {
            select: {
              id: true,
              title: true,
              funderName: true,
              status: true,
              createdAt: true,
            },
          },
          savedGrants: {
            select: {
              title: true,
              funderName: true,
              matchScore: true,
              savedAt: true,
            },
          },
        },
      });
      organizationData = org;
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      organization: organizationData ? {
        id: organizationData.id,
        name: organizationData.name,
        mission: organizationData.mission,
        programAreas: organizationData.programAreas,
        documents: organizationData.documents,
        proposals: organizationData.proposals,
        savedGrants: organizationData.savedGrants,
      } : null,
      feedback,
      activityLog: auditLogs,
      loginHistory: loginAttempts,
    };

    await auditDataExported(user.id, user.email, user.organizationId || "", "full_export");

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="user-data-export-${user.id}.json"`,
      },
    });
  } catch (error) {
    console.error("Data export error:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
