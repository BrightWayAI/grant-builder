// Grants.gov API integration
// API docs: https://www.grants.gov/web/grants/s2s/grantor-applicant-api/api-guide.html

const GRANTS_GOV_API_BASE = "https://www.grants.gov/grantsws/rest/opportunities/search";

export interface GrantsGovOpportunity {
  id: string;
  number: string;
  title: string;
  agency: string;
  agencyCode: string;
  openDate: string;
  closeDate: string | null;
  awardFloor: number;
  awardCeiling: number;
  description: string;
  opportunityCategory: string;
  eligibleApplicants: string[];
  cfdaList: string[];
}

export interface GrantSearchParams {
  keyword?: string;
  fundingCategories?: string[];
  eligibilities?: string[];
  agencies?: string[];
  dateRange?: number; // days from now
}

interface GrantsGovSearchResponse {
  oppHits: Array<{
    id: string;
    number: string;
    title: string;
    agencyCode: string;
    agency: string;
    openDate: string;
    closeDate: string | null;
    oppStatus: string;
    docType: string;
    cfdaList: string[];
    oppCfda?: string;
  }>;
  hitCount: number;
}

interface GrantsGovDetailResponse {
  id: string;
  number: string;
  title: string;
  agencyCode: string;
  agency: string;
  openDate: string;
  closeDate: string | null;
  awardFloor: number;
  awardCeiling: number;
  synopsis: { synopsisDesc: string } | null;
  opportunityCategory: { category: string; description: string };
  eligibilities: Array<{ eligibilityCode: string; description: string }>;
  cfdaList: string[];
}

// Map organization types to Grants.gov eligibility codes
const ELIGIBILITY_MAPPING: Record<string, string[]> = {
  "501c3": ["25"], // Nonprofits with 501(c)(3) status
  nonprofit: ["25", "21"], // Various nonprofit codes
  government: ["00", "01", "02", "04", "05", "06"], // State/local gov
  tribal: ["07"], // Native American tribal organizations
  education: ["20", "22"], // Educational institutions
  small_business: ["12"], // Small businesses
  individual: ["13"], // Individuals
};

// Map program areas to Grants.gov funding categories
const CATEGORY_MAPPING: Record<string, string[]> = {
  Education: ["ED"],
  "Health & Human Services": ["HL", "IS"],
  "Arts & Culture": ["AR", "HU"],
  Environment: ["EN", "NR"],
  "Community Development": ["CD", "RA", "HO"],
  "Youth Development": ["ED", "IS"],
  Housing: ["HO"],
  "Workforce Development": ["ELT", "ED"],
  "Food Security": ["FN", "AG"],
  "Mental Health": ["HL"],
  "Disability Services": ["HL", "IS"],
  "Senior Services": ["IS"],
};

export async function searchGrants(params: GrantSearchParams): Promise<GrantsGovOpportunity[]> {
  try {
    const searchBody: Record<string, unknown> = {
      oppStatuses: "forecasted|posted",
      sortBy: "openDate|desc",
      rows: 100,
    };

    if (params.keyword) {
      searchBody.keyword = params.keyword;
    }

    if (params.fundingCategories && params.fundingCategories.length > 0) {
      searchBody.fundingCategories = params.fundingCategories.join("|");
    }

    if (params.eligibilities && params.eligibilities.length > 0) {
      searchBody.eligibilities = params.eligibilities.join("|");
    }

    if (params.agencies && params.agencies.length > 0) {
      searchBody.agencies = params.agencies.join("|");
    }

    if (params.dateRange) {
      const now = new Date();
      const future = new Date(now.getTime() + params.dateRange * 24 * 60 * 60 * 1000);
      searchBody.closeDateRange = `${formatDate(now)}|${formatDate(future)}`;
    }

    const response = await fetch(GRANTS_GOV_API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      throw new Error(`Grants.gov API error: ${response.status}`);
    }

    const data: GrantsGovSearchResponse = await response.json();

    // Fetch details for each opportunity to get full info
    const opportunities: GrantsGovOpportunity[] = [];
    
    // Only fetch details for first 25 to avoid rate limiting
    const opsToFetch = data.oppHits.slice(0, 25);
    
    for (const hit of opsToFetch) {
      try {
        const detail = await getGrantDetail(hit.id);
        if (detail) {
          opportunities.push(detail);
        }
      } catch {
        // Skip opportunities we can't fetch details for
        opportunities.push({
          id: hit.id,
          number: hit.number,
          title: hit.title,
          agency: hit.agency,
          agencyCode: hit.agencyCode,
          openDate: hit.openDate,
          closeDate: hit.closeDate,
          awardFloor: 0,
          awardCeiling: 0,
          description: "",
          opportunityCategory: "",
          eligibleApplicants: [],
          cfdaList: hit.cfdaList || [],
        });
      }
    }

    return opportunities;
  } catch (error) {
    console.error("Error searching Grants.gov:", error);
    throw error;
  }
}

async function getGrantDetail(opportunityId: string): Promise<GrantsGovOpportunity | null> {
  try {
    const response = await fetch(
      `https://www.grants.gov/grantsws/rest/opportunity/details?oppId=${opportunityId}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data: GrantsGovDetailResponse = await response.json();

    return {
      id: data.id,
      number: data.number,
      title: data.title,
      agency: data.agency,
      agencyCode: data.agencyCode,
      openDate: data.openDate,
      closeDate: data.closeDate,
      awardFloor: data.awardFloor || 0,
      awardCeiling: data.awardCeiling || 0,
      description: data.synopsis?.synopsisDesc || "",
      opportunityCategory: data.opportunityCategory?.category || "",
      eligibleApplicants: data.eligibilities?.map((e) => e.description) || [],
      cfdaList: data.cfdaList || [],
    };
  } catch {
    return null;
  }
}

function formatDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export interface OrganizationProfile {
  geography?: string | null;
  programAreas: string[];
  budgetRange?: string | null;
  orgType?: string | null;
}

export function calculateMatchScore(
  grant: GrantsGovOpportunity,
  orgProfile: OrganizationProfile
): number {
  let score = 0;
  let factors = 0;

  // Category match (40 points)
  if (orgProfile.programAreas.length > 0) {
    factors++;
    const orgCategories = orgProfile.programAreas.flatMap(
      (area) => CATEGORY_MAPPING[area] || []
    );
    if (orgCategories.some((cat) => grant.opportunityCategory.includes(cat))) {
      score += 40;
    } else if (grant.cfdaList.some((cfda) => 
      orgCategories.some((cat) => cfda.startsWith(cat))
    )) {
      score += 25;
    }
  }

  // Eligibility match (30 points)
  if (orgProfile.orgType) {
    factors++;
    const eligCodes = ELIGIBILITY_MAPPING[orgProfile.orgType] || ELIGIBILITY_MAPPING["501c3"];
    const eligDescriptions = eligCodes.map((code) => getEligibilityDescription(code));
    
    if (grant.eligibleApplicants.length === 0) {
      // No restrictions, assume eligible
      score += 20;
    } else if (
      grant.eligibleApplicants.some((ea) =>
        eligDescriptions.some((ed) => ea.toLowerCase().includes(ed.toLowerCase()))
      ) ||
      grant.eligibleApplicants.some((ea) => 
        ea.toLowerCase().includes("nonprofit") || 
        ea.toLowerCase().includes("501") ||
        ea.toLowerCase().includes("any")
      )
    ) {
      score += 30;
    }
  }

  // Budget/Award range match (30 points)
  if (orgProfile.budgetRange && grant.awardCeiling > 0) {
    factors++;
    const budgetMax = getBudgetMax(orgProfile.budgetRange);
    
    // Check if grant award is reasonable for org size
    if (grant.awardCeiling <= budgetMax * 0.5) {
      score += 30; // Award is manageable
    } else if (grant.awardCeiling <= budgetMax) {
      score += 20; // Award is significant but possible
    } else if (grant.awardFloor <= budgetMax * 0.5) {
      score += 15; // Minimum award is manageable
    }
  }

  // Normalize to 100 if we have factors
  if (factors > 0) {
    return Math.round((score / (factors * (100 / 3))) * 100);
  }

  return 50; // Default middle score if no factors to compare
}

function getEligibilityDescription(code: string): string {
  const descriptions: Record<string, string> = {
    "00": "State governments",
    "01": "County governments", 
    "02": "City or township governments",
    "04": "Special district governments",
    "05": "Independent school districts",
    "06": "Public institutions of higher education",
    "07": "Native American tribal governments",
    "12": "Small businesses",
    "13": "Individuals",
    "20": "Private institutions of higher education",
    "21": "Nonprofits without 501(c)(3)",
    "22": "Public housing authorities",
    "25": "Nonprofits with 501(c)(3)",
  };
  return descriptions[code] || "";
}

function getBudgetMax(budgetRange: string): number {
  const ranges: Record<string, number> = {
    under_500k: 500000,
    "500k_1m": 1000000,
    "1m_2m": 2000000,
    "2m_5m": 5000000,
    over_5m: 10000000,
  };
  return ranges[budgetRange] || 1000000;
}

export function getSearchParamsForOrg(orgProfile: OrganizationProfile): GrantSearchParams {
  const params: GrantSearchParams = {
    dateRange: 90, // Look 90 days ahead
  };

  // Get funding categories from program areas
  if (orgProfile.programAreas.length > 0) {
    const categories = new Set<string>();
    orgProfile.programAreas.forEach((area) => {
      const cats = CATEGORY_MAPPING[area];
      if (cats) {
        cats.forEach((c) => categories.add(c));
      }
    });
    if (categories.size > 0) {
      params.fundingCategories = Array.from(categories);
    }
  }

  // Get eligibility codes from org type
  if (orgProfile.orgType) {
    const eligCodes = ELIGIBILITY_MAPPING[orgProfile.orgType];
    if (eligCodes) {
      params.eligibilities = eligCodes;
    }
  }

  return params;
}
