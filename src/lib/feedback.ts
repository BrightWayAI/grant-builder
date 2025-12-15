import prisma from "./db";
import { sendEmail } from "./email";

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

export async function sendEmailFeedback(to: string, data: {
  email?: string | null;
  organizationName?: string | null;
  sentiment: string;
  message: string;
  pageUrl?: string;
}) {
  if (!to) return;
  const subject = `Beta feedback (${data.sentiment})`;
  const html = `
    <p><strong>From:</strong> ${data.email || "unknown"}</p>
    <p><strong>Org:</strong> ${data.organizationName || "unknown"}</p>
    <p><strong>Page:</strong> ${data.pageUrl || "unknown"}</p>
    <p><strong>Sentiment:</strong> ${data.sentiment}</p>
    <p><strong>Message:</strong><br/>${(data.message || "").replace(/\n/g, "<br/>")}</p>
  `;
  const text = `From: ${data.email || "unknown"}
Org: ${data.organizationName || "unknown"}
Page: ${data.pageUrl || "unknown"}
Sentiment: ${data.sentiment}
Message:
${data.message || ""}`;

  try {
    await sendEmail({ to, subject, html, text });
  } catch (err) {
    console.error("Email feedback error", err);
  }
}
