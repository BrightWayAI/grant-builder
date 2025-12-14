import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { stripe, PLANS, PlanType } from "@/lib/stripe";
import { z } from "zod";

const checkoutSchema = z.object({
  plan: z.enum(["individual", "teams", "enterprise"]),
  seats: z.number().min(1).optional().default(1),
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
    const { plan, seats } = checkoutSchema.parse(body);

    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
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
        seats: seats.toString(),
      },
      subscription_data: {
        metadata: {
          organizationId: organization.id,
          plan,
          seats: seats.toString(),
        },
      },
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
