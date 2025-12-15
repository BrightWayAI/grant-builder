import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { saveFeedback, sendSlackFeedback, sendEmailFeedback } from "@/lib/feedback";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const sentiment = body.sentiment as "POSITIVE" | "NEUTRAL" | "NEGATIVE";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const pageUrl = typeof body.pageUrl === "string" ? body.pageUrl : undefined;
    const allowContact = Boolean(body.allowContact);
    const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : undefined;

    if (!sentiment || !["POSITIVE", "NEUTRAL", "NEGATIVE"].includes(sentiment)) {
      return NextResponse.json({ error: "Invalid sentiment" }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const organization = user.organizationId
      ? await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } })
      : null;

    await saveFeedback({
      organizationId: user.organizationId,
      userId: user.id,
      payload: { sentiment, message, pageUrl, allowContact, metadata },
    });

    const webhook = process.env.SLACK_FEEDBACK_WEBHOOK_URL;
    const emailTo = process.env.FEEDBACK_EMAIL_TO;

    if (webhook) {
      await sendSlackFeedback(webhook, {
        email: user.email,
        organizationName: organization?.name || null,
        sentiment,
        message,
        pageUrl,
      });
    }

    if (emailTo) {
      await sendEmailFeedback(emailTo, {
        email: user.email,
        organizationName: organization?.name || null,
        sentiment,
        message,
        pageUrl,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feedback error", error);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}
