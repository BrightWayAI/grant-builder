import { Resend } from "resend";

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

const FROM_EMAIL = process.env.EMAIL_FROM || "Brightway Grants <noreply@brightwayai.com>";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("Failed to send email:", error);
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error("Email send error:", error);
    throw error;
  }
}

export async function sendTeamInviteEmail({
  to,
  inviterName,
  organizationName,
  role,
}: {
  to: string;
  inviterName: string;
  organizationName: string;
  role: string;
}) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const signupUrl = `${baseUrl}/signup?email=${encodeURIComponent(to)}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background: #2563eb; padding: 12px; border-radius: 12px;">
          <span style="color: white; font-size: 24px;">✨</span>
        </div>
        <h1 style="margin: 16px 0 8px; font-size: 24px;">You're invited to join ${organizationName}</h1>
      </div>
      
      <p style="margin-bottom: 16px;">
        <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on Brightway Grants as a <strong>${role}</strong>.
      </p>
      
      <p style="margin-bottom: 24px;">
        Brightway Grants is an AI-powered grant writing platform that helps nonprofits write better proposals in less time.
      </p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${signupUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
          Accept Invitation
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
      
      <p style="color: #999; font-size: 12px; text-align: center;">
        Brightway Grants • AI-Powered Grant Writing
      </p>
    </body>
    </html>
  `;

  const text = `
You're invited to join ${organizationName}

${inviterName} has invited you to join ${organizationName} on Brightway Grants as a ${role}.

Accept your invitation: ${signupUrl}

If you didn't expect this invitation, you can safely ignore this email.
  `.trim();

  return sendEmail({
    to,
    subject: `You're invited to join ${organizationName} on Brightway Grants`,
    html,
    text,
  });
}

export async function sendPaymentFailedEmail({
  to,
  organizationName,
}: {
  to: string;
  organizationName: string;
}) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const settingsUrl = `${baseUrl}/settings`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="margin: 16px 0 8px; font-size: 24px;">Payment Failed</h1>
      </div>
      
      <p style="margin-bottom: 16px;">
        We were unable to process your payment for <strong>${organizationName}</strong>'s Brightway Grants subscription.
      </p>
      
      <p style="margin-bottom: 24px;">
        Please update your payment method to continue using Brightway Grants without interruption.
      </p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${settingsUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
          Update Payment Method
        </a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
      
      <p style="color: #999; font-size: 12px; text-align: center;">
        Brightway Grants • AI-Powered Grant Writing
      </p>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `Action Required: Payment failed for ${organizationName}`,
    html,
  });
}

export async function sendWelcomeEmail({
  to,
  name,
}: {
  to: string;
  name: string;
}) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background: #2563eb; padding: 12px; border-radius: 12px;">
          <span style="color: white; font-size: 24px;">✨</span>
        </div>
        <h1 style="margin: 16px 0 8px; font-size: 24px;">Welcome to Brightway Grants!</h1>
      </div>
      
      <p style="margin-bottom: 16px;">
        Hi ${name},
      </p>
      
      <p style="margin-bottom: 16px;">
        Thanks for signing up! You're ready to write your first proposal.
      </p>
      
      <p style="margin-bottom: 24px;">
        Here's how to get started:
      </p>
      
      <ol style="margin-bottom: 24px; padding-left: 20px;">
        <li style="margin-bottom: 8px;"><strong>Upload your documents</strong> - Past proposals, annual reports, and organizational info help us write in your voice.</li>
        <li style="margin-bottom: 8px;"><strong>Create a proposal</strong> - Upload an RFP and we'll parse the requirements automatically.</li>
        <li style="margin-bottom: 8px;"><strong>Generate & edit</strong> - Get AI-drafted sections, then refine with our inline editor.</li>
      </ol>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${baseUrl}/proposals/new" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
          Create Your First Proposal
        </a>
      </div>
      
      <p style="margin-bottom: 16px;">
        Your first proposal is free—no credit card required.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
      
      <p style="color: #999; font-size: 12px; text-align: center;">
        Brightway Grants • AI-Powered Grant Writing
      </p>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: "Welcome to Brightway Grants!",
    html,
  });
}

interface Grant {
  title: string;
  funderName: string;
  deadline?: Date | null;
  awardCeiling?: number | null;
  matchScore: number;
}

export async function sendGrantDigest({
  to,
  organizationName,
  grants,
}: {
  to: string;
  organizationName: string;
  grants: Grant[];
}) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const grantListHtml = grants
    .map(
      (grant) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <strong>${grant.title}</strong><br>
          <span style="color: #666; font-size: 13px;">${grant.funderName}</span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
          ${grant.deadline ? new Date(grant.deadline).toLocaleDateString() : "Rolling"}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
          ${grant.awardCeiling ? `$${grant.awardCeiling.toLocaleString()}` : "-"}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
          <span style="background: ${grant.matchScore >= 70 ? "#dcfce7" : grant.matchScore >= 40 ? "#fef9c3" : "#fee2e2"}; padding: 2px 8px; border-radius: 12px; font-size: 12px;">
            ${grant.matchScore}%
          </span>
        </td>
      </tr>
    `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background: #2563eb; padding: 12px; border-radius: 12px;">
          <span style="color: white; font-size: 24px;">✨</span>
        </div>
        <h1 style="margin: 16px 0 8px; font-size: 24px;">Your Weekly Grant Digest</h1>
        <p style="color: #666; margin: 0;">New opportunities matching ${organizationName}'s profile</p>
      </div>
      
      <p style="margin-bottom: 16px;">
        We found <strong>${grants.length} new grant${grants.length !== 1 ? "s" : ""}</strong> that match your organization's focus areas this week.
      </p>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 12px; text-align: left; font-weight: 600;">Grant</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Deadline</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Max Award</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Match</th>
          </tr>
        </thead>
        <tbody>
          ${grantListHtml}
        </tbody>
      </table>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${baseUrl}/discover" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
          View All Matching Grants
        </a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
      
      <p style="color: #999; font-size: 12px; text-align: center;">
        You're receiving this because you enabled grant digest emails. 
        <a href="${baseUrl}/settings" style="color: #999;">Manage preferences</a>
      </p>
    </body>
    </html>
  `;

  const text = `
Your Weekly Grant Digest

We found ${grants.length} new grant${grants.length !== 1 ? "s" : ""} matching ${organizationName}'s profile this week.

${grants.map((g) => `- ${g.title} (${g.funderName}) - ${g.matchScore}% match`).join("\n")}

View all matching grants: ${baseUrl}/discover
  `.trim();

  return sendEmail({
    to,
    subject: `${grants.length} new grants match ${organizationName}`,
    html,
    text,
  });
}
