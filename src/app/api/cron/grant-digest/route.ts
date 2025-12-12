import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { sendGrantDigest } from "@/lib/email";
import {
  searchGrants,
  calculateMatchScore,
  getSearchParamsForOrg,
} from "@/lib/grants-gov";

// This endpoint should be called by a cron job (e.g., Railway cron, Vercel cron)
// Weekly on Mondays at 9am
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all organizations with digest enabled
    const orgsWithDigest = await prisma.grantDigestPreference.findMany({
      where: { enabled: true },
      include: {
        organization: {
          include: {
            users: {
              where: { role: "admin" },
              select: { email: true },
              take: 1,
            },
          },
        },
      },
    });

    const results = [];

    for (const pref of orgsWithDigest) {
      const org = pref.organization;
      const adminEmail = org.users[0]?.email;

      if (!adminEmail) {
        results.push({ orgId: org.id, status: "skipped", reason: "No admin email" });
        continue;
      }

      try {
        // Search for grants matching this org
        const searchParams = getSearchParamsForOrg({
          geography: org.geography,
          programAreas: org.programAreas,
          budgetRange: org.budgetRange,
          orgType: org.orgType,
        });

        // Only get grants posted in the last week
        searchParams.dateRange = 7;

        const grants = await searchGrants(searchParams);

        // Calculate scores and filter top matches
        const scoredGrants = grants
          .map((grant) => ({
            ...grant,
            matchScore: calculateMatchScore(grant, {
              geography: org.geography,
              programAreas: org.programAreas,
              budgetRange: org.budgetRange,
              orgType: org.orgType,
            }),
          }))
          .filter((g) => g.matchScore >= 30) // Only include decent matches
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 10); // Top 10

        if (scoredGrants.length === 0) {
          results.push({ orgId: org.id, status: "skipped", reason: "No matching grants" });
          continue;
        }

        // Format for email
        const emailGrants = scoredGrants.map((grant) => ({
          title: grant.title,
          funder: grant.agency,
          deadline: grant.closeDate
            ? new Date(grant.closeDate).toLocaleDateString()
            : null,
          amount: grant.awardCeiling
            ? `Up to $${grant.awardCeiling.toLocaleString()}`
            : "TBD",
          matchScore: grant.matchScore,
          url: `https://www.grants.gov/search-results-detail/${grant.id}`,
        }));

        await sendGrantDigest({
          to: adminEmail,
          organizationName: org.name,
          grants: emailGrants,
        });

        // Update last sent timestamp
        await prisma.grantDigestPreference.update({
          where: { id: pref.id },
          data: { lastSentAt: new Date() },
        });

        results.push({
          orgId: org.id,
          status: "sent",
          grantsCount: scoredGrants.length,
        });
      } catch (error) {
        console.error(`Error processing digest for org ${org.id}:`, error);
        results.push({
          orgId: org.id,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Error in grant digest cron:", error);
    return NextResponse.json(
      { error: "Failed to process digests" },
      { status: 500 }
    );
  }
}
