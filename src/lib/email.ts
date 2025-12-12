import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

interface GrantDigestEmail {
  to: string;
  organizationName: string;
  grants: Array<{
    title: string;
    funder: string;
    deadline: string | null;
    amount: string;
    matchScore: number;
    url: string;
  }>;
}

export async function sendGrantDigest(data: GrantDigestEmail) {
  const { to, organizationName, grants } = data;

  if (grants.length === 0) {
    return null;
  }

  const grantsHtml = grants
    .map(
      (grant) => `
      <tr>
        <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
          <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">${grant.title}</div>
          <div style="font-size: 14px; color: #6b7280;">${grant.funder}</div>
        </td>
        <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          <span style="display: inline-block; background: ${
            grant.matchScore >= 70 ? "#dcfce7" : grant.matchScore >= 40 ? "#fef9c3" : "#fee2e2"
          }; color: ${
            grant.matchScore >= 70 ? "#166534" : grant.matchScore >= 40 ? "#854d0e" : "#991b1b"
          }; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 500;">
            ${grant.matchScore}% match
          </span>
        </td>
        <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          <div style="font-size: 14px; color: #6b7280;">${grant.amount}</div>
          ${grant.deadline ? `<div style="font-size: 12px; color: #9ca3af;">Due: ${grant.deadline}</div>` : ""}
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
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="background: #2563eb; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">Brightway Grants</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Weekly Grant Discovery Digest</p>
            </div>
            
            <div style="padding: 24px;">
              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;">
                Hi there! Here are ${grants.length} new grant opportunities matching <strong>${organizationName}</strong>'s profile:
              </p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                <thead>
                  <tr style="background: #f9fafb;">
                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Opportunity</th>
                    <th style="padding: 12px 16px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Match</th>
                    <th style="padding: 12px 16px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Award</th>
                  </tr>
                </thead>
                <tbody>
                  ${grantsHtml}
                </tbody>
              </table>
              
              <div style="text-align: center; padding: 16px 0;">
                <a href="${process.env.NEXTAUTH_URL || "https://app.brightwayai.com"}/discover" 
                   style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                  View All Opportunities
                </a>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 16px 24px; text-align: center; font-size: 12px; color: #6b7280;">
              <p style="margin: 0;">
                You're receiving this because you have grant digests enabled for ${organizationName}.
                <a href="${process.env.NEXTAUTH_URL || "https://app.brightwayai.com"}/settings" style="color: #2563eb;">Manage preferences</a>
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const result = await getResend().emails.send({
      from: "Brightway Grants <grants@brightwayai.com>",
      to,
      subject: `${grants.length} New Grant Opportunities for ${organizationName}`,
      html,
    });
    return result;
  } catch (error) {
    console.error("Failed to send grant digest email:", error);
    throw error;
  }
}
