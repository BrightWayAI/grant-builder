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

export const PLANS = {
  personal: {
    name: "Personal",
    priceId: process.env.STRIPE_PRICE_PERSONAL!,
    proposalsPerMonth: 10,
    seats: 1,
  },
  teams: {
    name: "Teams",
    priceId: process.env.STRIPE_PRICE_TEAMS!,
    proposalsPerMonth: 25, // per seat
    seats: null, // unlimited
  },
} as const;

export type PlanType = keyof typeof PLANS;

export function getPlanByPriceId(priceId: string): PlanType | null {
  if (priceId === PLANS.personal.priceId) return "personal";
  if (priceId === PLANS.teams.priceId) return "teams";
  return null;
}

export function getProposalLimit(plan: PlanType, seatCount: number = 1): number {
  if (plan === "personal") return PLANS.personal.proposalsPerMonth;
  return PLANS.teams.proposalsPerMonth * seatCount;
}
