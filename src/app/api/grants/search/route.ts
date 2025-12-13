import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import {
  searchGrants,
  calculateMatchScore,
  getSearchParamsForOrg,
  GrantsGovOpportunity,
} from "@/lib/grants-gov";

export interface GrantWithScore extends GrantsGovOpportunity {
  matchScore: number;
  isSaved: boolean;
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get("keyword") || undefined;
    const category = searchParams.get("category") || undefined;
    const featured = searchParams.get("featured") === "true";

    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        geography: true,
        programAreas: true,
        budgetRange: true,
        orgType: true,
        fundingMin: true,
        fundingMax: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Get saved grants for this org
    const savedGrants = await prisma.savedGrant.findMany({
      where: { organizationId: user.organizationId },
      select: { grantId: true },
    });
    const savedGrantIds = new Set(savedGrants.map((sg) => sg.grantId));

    // Build search params
    let grants: GrantsGovOpportunity[];
    
    if (featured || (!keyword && organization.programAreas.length === 0)) {
      // Get general grants for nonprofits if no specific criteria
      grants = await searchGrants({
        eligibilities: organization.orgType ? undefined : ["25"], // 501c3 if no type specified
        rows: 50,
      });
    } else {
      // Build search params based on org profile
      const baseParams = getSearchParamsForOrg(organization);
      
      if (keyword) {
        baseParams.keyword = keyword;
      }
      
      if (category) {
        baseParams.fundingCategories = [category];
      }

      grants = await searchGrants(baseParams);
    }

    // Calculate match scores and sort
    const grantsWithScores: GrantWithScore[] = grants
      .map((grant) => ({
        ...grant,
        matchScore: calculateMatchScore(grant, {
          geography: organization.geography,
          programAreas: organization.programAreas,
          budgetRange: organization.budgetRange,
          orgType: organization.orgType,
          fundingMin: organization.fundingMin,
          fundingMax: organization.fundingMax,
        }),
        isSaved: savedGrantIds.has(grant.id),
      }))
      .sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({
      grants: grantsWithScores,
      total: grantsWithScores.length,
      profile: {
        hasPrograms: organization.programAreas.length > 0,
        hasOrgType: !!organization.orgType,
        hasBudget: !!organization.budgetRange,
      },
    });
  } catch (error) {
    console.error("Error searching grants:", error);
    return NextResponse.json(
      { error: "Failed to search grants", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
