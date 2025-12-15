import prisma from "./db";

export type FeedbackPayload = {
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  message: string;
  pageUrl?: string;
  allowContact?: boolean;
  metadata?: Record<string, any>;
};

export async function saveFeedback(params: {
  organizationId?: string | null;
  userId?: string | null;
  payload: FeedbackPayload;
}) {
  const { organizationId, userId, payload } = params;
  return prisma.feedback.create({
    data: {
      organizationId: organizationId || undefined,
      userId: userId || undefined,
      sentiment: payload.sentiment,
      message: payload.message,
      pageUrl: payload.pageUrl,
      allowContact: Boolean(payload.allowContact),
      metadata: payload.metadata,
    },
  });
}

export async function sendSlackFeedback(webhookUrl: string, data: {
  email?: string | null;
  organizationName?: string | null;
  sentiment: string;
  message: string;
  pageUrl?: string;
}) {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `*Beta feedback* (${data.sentiment})\nFrom: ${data.email || "unknown"}\nOrg: ${data.organizationName || "unknown"}\nPage: ${data.pageUrl || "unknown"}\n---\n${data.message}`,
      }),
    });
  } catch (err) {
    console.error("Slack feedback error", err);
  }
}
