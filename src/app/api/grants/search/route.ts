import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import {
  calculateMatchScore,
  GrantsGovOpportunity,
  ELIGIBILITY_MAPPING,
  CATEGORY_MAPPING,
} from "@/lib/grants-gov";
import { searchAllSources, UnifiedOpportunity } from "@/lib/grant-sources";

export interface GrantWithScore extends GrantsGovOpportunity {
  matchScore: number;
  isSaved: boolean;
  source: string;
  url?: string;
  publisher?: string;
  confidence?: string;
}

export const dynamic = "force-dynamic";
export const maxDuration = 30; // Allow up to 30s for Grants.gov API

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }
    if (!user.organizationId) {
      return NextResponse.json({ error: "Please complete onboarding to set up your organization" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get("keyword") || undefined;
    const orgTypeParam = searchParams.get("orgType") || undefined;
    const areasParam = searchParams.get("areas") || undefined;

    // Get organization for scoring
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

    // Build search params from UI filters
    const searchGrantParams: {
      keyword?: string;
      eligibilities?: string[];
      fundingCategories?: string[];
      rows?: number;
    } = {
      rows: 25,
    };

    if (keyword) {
      searchGrantParams.keyword = keyword;
    }

    // Use UI filter org type, or fall back to profile
    const effectiveOrgType = orgTypeParam || organization.orgType;
    if (effectiveOrgType && ELIGIBILITY_MAPPING[effectiveOrgType]) {
      searchGrantParams.eligibilities = ELIGIBILITY_MAPPING[effectiveOrgType];
    }

    // Use UI filter areas, or fall back to profile
    const effectiveAreas = areasParam 
      ? areasParam.split(",").filter(Boolean)
      : organization.programAreas;
    
    if (effectiveAreas.length > 0) {
      const categories = new Set<string>();
      effectiveAreas.forEach((area) => {
        const cats = CATEGORY_MAPPING[area];
        if (cats) cats.forEach((c) => categories.add(c));
      });
      if (categories.size > 0) {
        searchGrantParams.fundingCategories = Array.from(categories);
      }
    }

    console.log("Search params:", JSON.stringify(searchGrantParams));

    // Search grants
    const grants = await searchAllSources(searchGrantParams);

    // Calculate match scores using profile (not UI filters)
    const grantsWithScores: GrantWithScore[] = grants
      .map((grant: UnifiedOpportunity) => ({
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
    });
  } catch (error) {
    console.error("Error searching grants:", error);
    return NextResponse.json(
      { error: "Failed to search grants", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
