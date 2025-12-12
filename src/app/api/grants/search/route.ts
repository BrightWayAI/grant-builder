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

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get("keyword") || undefined;
    const category = searchParams.get("category") || undefined;

    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        geography: true,
        programAreas: true,
        budgetRange: true,
        orgType: true,
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

    // Build search params based on org profile
    const baseParams = getSearchParamsForOrg(organization);
    
    if (keyword) {
      baseParams.keyword = keyword;
    }
    
    if (category) {
      baseParams.fundingCategories = [category];
    }

    const grants = await searchGrants(baseParams);

    // Calculate match scores and sort
    const grantsWithScores: GrantWithScore[] = grants
      .map((grant) => ({
        ...grant,
        matchScore: calculateMatchScore(grant, organization),
        isSaved: savedGrantIds.has(grant.id),
      }))
      .sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({
      grants: grantsWithScores,
      total: grantsWithScores.length,
    });
  } catch (error) {
    console.error("Error searching grants:", error);
    return NextResponse.json(
      { error: "Failed to search grants" },
      { status: 500 }
    );
  }
}
