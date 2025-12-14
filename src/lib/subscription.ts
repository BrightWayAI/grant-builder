import prisma from "@/lib/db";
import { getPlanByPriceId, getProposalLimit } from "@/lib/stripe";

export const PLAN_LIMITS = {
  trial: {
    proposalsPerMonth: 1,
    maxStorageMB: 100,      // 100 MB
    maxDocuments: 10,
    maxTeamMembers: 1,
  },
  personal: {
    proposalsPerMonth: 10,
    maxStorageMB: 500,      // 500 MB
    maxDocuments: 50,
    maxTeamMembers: 1,
  },
  teams: {
    proposalsPerMonth: 25,  // per seat
    maxStorageMB: 2048,     // 2 GB shared
    maxDocuments: 200,
    maxTeamMembers: 999,    // unlimited
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

export interface SubscriptionInfo {
  status: "trial" | "active" | "past_due" | "canceled" | "unpaid";
  canCreateProposal: boolean;
  proposalsUsed: number;
  proposalLimit: number;
  isTrialUsed: boolean;
  needsPayment: boolean;
  plan: string | null;
}

export async function getSubscriptionInfo(organizationId: string): Promise<SubscriptionInfo> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      subscriptionStatus: true,
      stripePriceId: true,
      proposalsUsedThisMonth: true,
      proposalResetDate: true,
      _count: {
        select: { proposals: true },
      },
    },
  });

  if (!organization) {
    return {
      status: "trial",
      canCreateProposal: false,
      proposalsUsed: 0,
      proposalLimit: 1,
      isTrialUsed: false,
      needsPayment: false,
      plan: null,
    };
  }

  const status = organization.subscriptionStatus.toLowerCase() as SubscriptionInfo["status"];
  const totalProposals = organization._count.proposals;
  const proposalsUsed = organization.proposalsUsedThisMonth;
  
  // Trial users get 1 free proposal
  if (status === "trial") {
    const isTrialUsed = totalProposals >= 1;
    return {
      status,
      canCreateProposal: !isTrialUsed,
      proposalsUsed: totalProposals,
      proposalLimit: 1,
      isTrialUsed,
      needsPayment: isTrialUsed,
      plan: null,
    };
  }

  // Active subscription
  if (status === "active" && organization.stripePriceId) {
    const plan = getPlanByPriceId(organization.stripePriceId);
    const limit = plan ? getProposalLimit(plan) : 10;
    
    return {
      status,
      canCreateProposal: proposalsUsed < limit,
      proposalsUsed,
      proposalLimit: limit,
      isTrialUsed: true,
      needsPayment: false,
      plan,
    };
  }

  // Past due - allow limited access
  if (status === "past_due") {
    return {
      status,
      canCreateProposal: false,
      proposalsUsed,
      proposalLimit: 0,
      isTrialUsed: true,
      needsPayment: true,
      plan: organization.stripePriceId ? getPlanByPriceId(organization.stripePriceId) : null,
    };
  }

  // Canceled or unpaid
  return {
    status,
    canCreateProposal: false,
    proposalsUsed: 0,
    proposalLimit: 0,
    isTrialUsed: true,
    needsPayment: true,
    plan: null,
  };
}

export async function incrementProposalCount(organizationId: string): Promise<void> {
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      proposalsUsedThisMonth: { increment: 1 },
    },
  });
}
