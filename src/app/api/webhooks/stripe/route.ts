import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe, getPlanByPriceId, getProposalLimit } from "@/lib/stripe";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleTrialEnding(subscription);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const organizationId = session.metadata?.organizationId;
  if (!organizationId) {
    console.error("No organizationId in checkout session metadata");
    return;
  }

  const subscriptionId = session.subscription as string;
  if (!subscriptionId) return;

  const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscription = subscriptionResponse as any;
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const seats = subscription.items?.data?.[0]?.quantity
    ? Number(subscription.items.data[0].quantity) || 1
    : subscription.metadata?.seats
    ? Number(subscription.metadata.seats) || 1
    : 1;
  const plan = getPlanByPriceId(priceId);
  const periodEnd = subscription.current_period_end 
    ? new Date(subscription.current_period_end * 1000) 
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: periodEnd,
      subscriptionStatus: "ACTIVE",
      proposalsUsedThisMonth: 0,
      proposalResetDate: periodEnd,
      seatsPurchased: plan === "teams" ? seats : 1,
      // If they lock in during beta, we still move them to ACTIVE immediately; adjust here if you prefer delayed activation
    },
  });

  console.log(`Subscription activated for org ${organizationId}: ${plan} plan`);
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata?.organizationId;
  if (!organizationId) {
    // Try to find by customer ID
    const org = await prisma.organization.findFirst({
      where: { stripeCustomerId: subscription.customer as string },
    });
    if (!org) {
      console.error("No organization found for subscription");
      return;
    }
    await updateOrganizationSubscription(org.id, subscription);
  } else {
    await updateOrganizationSubscription(organizationId, subscription);
  }
}

async function updateOrganizationSubscription(
  organizationId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscription: any
) {
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const seats = subscription.items?.data?.[0]?.quantity
    ? Number(subscription.items.data[0].quantity) || 1
    : subscription.metadata?.seats
    ? Number(subscription.metadata.seats) || 1
    : 1;
  
  let status: "ACTIVE" | "PAST_DUE" | "CANCELED" | "UNPAID" | "TRIAL" = "ACTIVE";
  switch (subscription.status) {
    case "active":
      status = "ACTIVE";
      break;
    case "past_due":
      status = "PAST_DUE";
      break;
    case "canceled":
      status = "CANCELED";
      break;
    case "unpaid":
      status = "UNPAID";
      break;
    case "trialing":
      status = "TRIAL";
      break;
  }

  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: periodEnd,
      subscriptionStatus: status,
      seatsPurchased: getPlanByPriceId(priceId) === "teams" ? seats : 1,
    },
  });

  console.log(`Subscription updated for org ${organizationId}: ${status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const org = await prisma.organization.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (org) {
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        subscriptionStatus: "CANCELED",
        stripeSubscriptionId: null,
        stripePriceId: null,
        seatsPurchased: null,
      },
    });
    console.log(`Subscription canceled for org ${org.id}`);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleInvoicePaid(invoice: any) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  const org = await prisma.organization.findFirst({
    where: { stripeSubscriptionId: subscriptionId as string },
  });

  if (org) {
    // Reset proposal count on successful payment
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        proposalsUsedThisMonth: 0,
        proposalResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subscriptionStatus: "ACTIVE",
      },
    });
    console.log(`Invoice paid, proposal count reset for org ${org.id}`);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePaymentFailed(invoice: any) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  const org = await prisma.organization.findFirst({
    where: { stripeSubscriptionId: subscriptionId as string },
  });

  if (org) {
    await prisma.organization.update({
      where: { id: org.id },
      data: { subscriptionStatus: "PAST_DUE" },
    });
    console.log(`Payment failed for org ${org.id}`);
    // TODO: Send email notification about failed payment
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleTrialEnding(subscription: any) {
  const org = await prisma.organization.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (org) {
    console.log(`Trial ending soon for org ${org.id}`);
    // TODO: Send email notification about trial ending
  }
}
