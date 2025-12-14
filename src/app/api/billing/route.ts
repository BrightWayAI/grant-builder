import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { getPlanByPriceId } from "@/lib/stripe";
import { PLAN_LIMITS } from "@/lib/subscription";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!user.organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      include: {
        documents: {
          select: { fileSize: true },
        },
        users: {
          select: { id: true },
        },
        _count: {
          select: { 
            proposals: true,
            documents: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const status = organization.subscriptionStatus.toLowerCase() as 
      "trial" | "active" | "past_due" | "canceled" | "unpaid";
    
    const plan = organization.stripePriceId 
      ? getPlanByPriceId(organization.stripePriceId) 
      : null;

    const limits = plan ? PLAN_LIMITS[plan] : PLAN_LIMITS.trial;
    const teamSize = organization.users.length;

    // Calculate storage used (in MB)
    const storageUsedBytes = organization.documents.reduce(
      (acc, doc) => acc + doc.fileSize, 
      0
    );
    const storageUsedMB = storageUsedBytes / (1024 * 1024);

    // For teams plan, limits scale with team size
    const proposalLimit = plan === "teams" 
      ? limits.proposalsPerMonth * teamSize 
      : limits.proposalsPerMonth;
    
    const documentsLimit = limits.maxDocuments;
    const storageLimitMB = limits.maxStorageMB;

    return NextResponse.json({
      status,
      plan,
      proposalsUsed: organization.proposalsUsedThisMonth,
      proposalLimit,
      storageUsedMB,
      storageLimitMB,
      documentsCount: organization._count.documents,
      documentsLimit,
      teamSize,
      teamLimit: limits.maxTeamMembers,
      currentPeriodEnd: organization.stripeCurrentPeriodEnd?.toISOString() || null,
      canCreateProposal: organization.proposalsUsedThisMonth < proposalLimit,
    });
  } catch (error) {
    console.error("Billing info error:", error);
    return NextResponse.json(
      { error: "Failed to get billing info" },
      { status: 500 }
    );
  }
}
