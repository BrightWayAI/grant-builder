import prisma from "@/lib/db";
import { getPlanByPriceId, getProposalLimit } from "@/lib/stripe";

export const PLAN_LIMITS = {
  beta: {
    proposalsPerMonth: 15,  // Same as teams
    maxStorageMB: 1024,     // 1 GB
    maxDocuments: 100,
    maxTeamMembers: 999,    // unlimited
  },
  trial: {
    proposalsPerMonth: 3,   // 3 free proposals
    maxStorageMB: 50,       // 50 MB
    maxDocuments: 5,
    maxTeamMembers: 1,
  },
  individual: {
    proposalsPerMonth: 2,   // 2 per month
    maxStorageMB: 250,      // 250 MB
    maxDocuments: 25,
    maxTeamMembers: 1,
  },
  teams: {
    proposalsPerMonth: 5,   // 5 per seat per month
    maxStorageMB: 1024,     // 1 GB shared
    maxDocuments: 100,
    maxTeamMembers: 999,    // unlimited
  },
  enterprise: {
    proposalsPerMonth: 50,
    maxStorageMB: 5120,     // 5 GB
    maxDocuments: 500,
    maxTeamMembers: 999,    // unlimited
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

export interface SubscriptionInfo {
  status: "beta" | "trial" | "active" | "past_due" | "canceled" | "unpaid";
  canCreateProposal: boolean;
  proposalsUsed: number;
  proposalLimit: number;
  isTrialUsed: boolean;
  needsPayment: boolean;
  plan: string | null;
  isBeta: boolean;
}

export async function getSubscriptionInfo(organizationId: string): Promise<SubscriptionInfo> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      subscriptionStatus: true,
      stripePriceId: true,
      proposalsUsedThisMonth: true,
      proposalResetDate: true,
      seatsPurchased: true,
      _count: {
        select: { proposals: true },
      },
    },
  });

  if (!organization) {
    return {
      status: "beta",
      canCreateProposal: false,
      proposalsUsed: 0,
      proposalLimit: PLAN_LIMITS.beta.proposalsPerMonth,
      isTrialUsed: false,
      needsPayment: false,
      plan: null,
      isBeta: true,
    };
  }

  const status = organization.subscriptionStatus.toLowerCase() as SubscriptionInfo["status"];
  const totalProposals = organization._count.proposals;
  const proposalsUsed = organization.proposalsUsedThisMonth;
  
  // Beta users get full access
  if (status === "beta") {
    const limit = PLAN_LIMITS.beta.proposalsPerMonth;
    return {
      status,
      canCreateProposal: proposalsUsed < limit,
      proposalsUsed,
      proposalLimit: limit,
      isTrialUsed: false,
      needsPayment: false,
      plan: null,
      isBeta: true,
    };
  }
  
  // Trial users get 3 free proposals
  if (status === "trial") {
    const limit = PLAN_LIMITS.trial.proposalsPerMonth;
    const isTrialUsed = totalProposals >= limit;
    return {
      status,
      canCreateProposal: !isTrialUsed,
      proposalsUsed: totalProposals,
      proposalLimit: limit,
      isTrialUsed,
      needsPayment: isTrialUsed,
      plan: null,
      isBeta: false,
    };
  }

  // Active subscription
  if (status === "active" && organization.stripePriceId) {
    const plan = getPlanByPriceId(organization.stripePriceId);
    const seats = organization.seatsPurchased || 1;
    const limit = plan ? getProposalLimit(plan, seats) : 10;
    
    return {
      status,
      canCreateProposal: proposalsUsed < limit,
      proposalsUsed,
      proposalLimit: limit,
      isTrialUsed: true,
      needsPayment: false,
      plan,
      isBeta: false,
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
      isBeta: false,
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
    isBeta: false,
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
