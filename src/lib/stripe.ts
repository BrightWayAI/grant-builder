import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
      typescript: true,
    });
  }
  return stripeInstance;
}

// For backward compatibility
export const stripe = {
  get customers() { return getStripe().customers; },
  get subscriptions() { return getStripe().subscriptions; },
  get checkout() { return getStripe().checkout; },
  get billingPortal() { return getStripe().billingPortal; },
  get webhooks() { return getStripe().webhooks; },
};

// Lazy-loaded to ensure env vars are available at runtime
export function getPlanConfig(plan: "individual" | "teams" | "enterprise") {
  const configs = {
    individual: {
      name: "Individual",
      priceId: process.env.STRIPE_PRICE_INDIVIDUAL || process.env.STRIPE_PRICE_PERSONAL,
      proposalsPerMonth: 2,   // 2 per month
      seats: 1,
    },
    teams: {
      name: "Teams",
      priceId: process.env.STRIPE_PRICE_TEAMS,
      proposalsPerMonth: 5,   // 5 per seat per month
      seats: null,
    },
    enterprise: {
      name: "Enterprise",
      priceId: process.env.STRIPE_PRICE_ENTERPRISE,
      proposalsPerMonth: 50,
      seats: null,
    },
  };
  return configs[plan];
}

// Keep PLANS for backward compatibility but make it a getter
export const PLANS = {
  get individual() { return getPlanConfig("individual"); },
  get teams() { return getPlanConfig("teams"); },
  get enterprise() { return getPlanConfig("enterprise"); },
};

export type PlanType = keyof typeof PLANS;

export function getPlanByPriceId(priceId: string): PlanType | null {
  if (priceId === PLANS.individual.priceId) return "individual";
  if (priceId === PLANS.teams.priceId) return "teams";
  if (priceId === PLANS.enterprise.priceId) return "enterprise";
  return null;
}

export function getProposalLimit(plan: PlanType, seatCount: number = 1): number {
  if (plan === "individual") return PLANS.individual.proposalsPerMonth;
  if (plan === "enterprise") return PLANS.enterprise.proposalsPerMonth;
  return PLANS.teams.proposalsPerMonth * seatCount;
}
