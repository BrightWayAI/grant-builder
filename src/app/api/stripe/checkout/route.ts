import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { stripe, PLANS, PlanType } from "@/lib/stripe";
import { z } from "zod";

const checkoutSchema = z.object({
  plan: z.enum(["individual", "teams", "enterprise"]),
  seats: z.number().int().min(1).optional().default(1),
  lockInDiscount: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!user.organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const body = await req.json();
    const { plan, seats, lockInDiscount } = checkoutSchema.parse(body);

    if (plan === "teams" && seats < 3) {
      return NextResponse.json(
        { error: "Teams plan requires at least 3 seats." },
        { status: 400 }
      );
    }

    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        id: true,
        name: true,
        stripeCustomerId: true,
        subscriptionStatus: true,
        seatsPurchased: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Get or create Stripe customer
    let customerId = organization.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: organization.name,
        metadata: {
          organizationId: organization.id,
          userId: user.id,
        },
      });
      customerId = customer.id;

      await prisma.organization.update({
        where: { id: organization.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const selectedPlan = PLANS[plan as PlanType];
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    // Validate price ID exists
    if (!selectedPlan.priceId) {
      console.error(`Missing price ID for plan: ${plan}`);
      return NextResponse.json(
        { error: `Price not configured for ${plan} plan` },
        { status: 500 }
      );
    }

    console.log(`Creating checkout for plan: ${plan}, priceId: ${selectedPlan.priceId}`);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: selectedPlan.priceId,
          quantity: plan === "teams" ? seats : 1,
        },
      ],
      success_url: `${baseUrl}/dashboard?subscription=success`,
      cancel_url: `${baseUrl}/dashboard?subscription=canceled`,
      metadata: {
        organizationId: organization.id,
        plan,
        seats: (plan === "teams" ? seats : 1).toString(),
        lockInDiscount: lockInDiscount ? "true" : "false",
      },
      subscription_data: {
        metadata: {
          organizationId: organization.id,
          plan,
          seats: (plan === "teams" ? seats : 1).toString(),
          lockInDiscount: lockInDiscount ? "true" : "false",
        },
      },
      discounts: lockInDiscount
        ? [
            {
              coupon: process.env.STRIPE_BETA_COUPON_ID || "HSdmrDjW",
            },
          ]
        : undefined,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
