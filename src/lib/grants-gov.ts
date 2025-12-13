// Grants.gov API integration
// Using the public search API

const GRANTS_GOV_SEARCH_URL = "https://www.grants.gov/grantsws/rest/opportunities/search";
const GRANTS_GOV_DETAIL_URL = "https://www.grants.gov/grantsws/rest/opportunity/details";

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
  rows?: number;
}

interface GrantsGovHit {
  id: string;
  number: string;
  title: string;
  agencyCode: string;
  agency: string;
  openDate: string;
  closeDate: string | null;
  oppStatus: string;
  awardCeiling: number;
  awardFloor: number;
  synopsis?: string;
  cfdaList?: string[];
}

interface GrantsGovSearchResponse {
  oppHits: GrantsGovHit[];
  hitCount: number;
}

// Map organization types to Grants.gov eligibility codes
export const ELIGIBILITY_MAPPING: Record<string, string[]> = {
  "501c3": ["25"], // Nonprofits with 501(c)(3) status
  nonprofit: ["25", "21"], // Various nonprofit codes
  government: ["00", "01", "02", "04", "05", "06"], // State/local gov
  tribal: ["07"], // Native American tribal organizations
  education: ["20", "22"], // Educational institutions
  small_business: ["12"], // Small businesses
  individual: ["13"], // Individuals
};

// Map program areas to Grants.gov funding category codes
export const CATEGORY_MAPPING: Record<string, string[]> = {
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

// Eligibility code descriptions
const ELIGIBILITY_DESCRIPTIONS: Record<string, string> = {
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

/**
 * Search for grants from Grants.gov
 * Always returns results - uses broad search if specific filters return nothing
 */
export async function searchGrants(params: GrantSearchParams = {}): Promise<GrantsGovOpportunity[]> {
  const rows = params.rows || 50;
  
  // Try with filters first
  let grants = await executeSearch(params, rows);
  
  // If no results with filters, try broader search
  if (grants.length === 0 && (params.fundingCategories || params.eligibilities)) {
    console.log("No results with filters, trying broader search...");
    grants = await executeSearch({ keyword: params.keyword, rows }, rows);
  }
  
  // If still no results, get featured/recent grants
  if (grants.length === 0) {
    console.log("Fetching featured grants...");
    grants = await executeSearch({}, rows);
  }
  
  return grants;
}

async function executeSearch(params: GrantSearchParams, rows: number): Promise<GrantsGovOpportunity[]> {
  try {
    const searchBody: Record<string, unknown> = {
      oppStatuses: "posted",
      sortBy: "openDate|desc",
      rows,
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

    const response = await fetch(GRANTS_GOV_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(searchBody),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Grants.gov API error: ${response.status}`);
      return [];
    }

    const data: GrantsGovSearchResponse = await response.json();
    
    if (!data.oppHits || data.oppHits.length === 0) {
      return [];
    }

    // Map hits to our format - use data from search results directly
    // Avoid making individual detail calls to prevent rate limiting
    return data.oppHits.map((hit) => ({
      id: hit.id,
      number: hit.number,
      title: hit.title,
      agency: hit.agency,
      agencyCode: hit.agencyCode,
      openDate: hit.openDate,
      closeDate: hit.closeDate,
      awardFloor: hit.awardFloor || 0,
      awardCeiling: hit.awardCeiling || 0,
      description: hit.synopsis || "",
      opportunityCategory: "",
      eligibleApplicants: [],
      cfdaList: hit.cfdaList || [],
    }));
  } catch (error) {
    console.error("Error searching Grants.gov:", error);
    return [];
  }
}

/**
 * Get detailed information about a specific grant
 */
export async function getGrantDetail(opportunityId: string): Promise<GrantsGovOpportunity | null> {
  try {
    const response = await fetch(`${GRANTS_GOV_DETAIL_URL}?oppId=${opportunityId}`, {
      headers: { "Accept": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

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
      eligibleApplicants: data.eligibilities?.map((e: { description: string }) => e.description) || [],
      cfdaList: data.cfdaList || [],
    };
  } catch {
    return null;
  }
}

export interface OrganizationProfile {
  geography?: string | null;
  programAreas: string[];
  budgetRange?: string | null;
  orgType?: string | null;
  fundingMin?: number | null;
  fundingMax?: number | null;
}

/**
 * Calculate how well a grant matches an organization's profile
 * Returns a score from 0-100
 */
export function calculateMatchScore(
  grant: GrantsGovOpportunity,
  orgProfile: OrganizationProfile
): number {
  let score = 50; // Base score - all grants start with 50%
  let maxBonus = 50; // Maximum additional points from matching

  // Program area / category matching (up to +20 points)
  if (orgProfile.programAreas.length > 0) {
    const orgCategories = orgProfile.programAreas.flatMap(
      (area) => CATEGORY_MAPPING[area] || []
    );
    
    // Check CFDA codes for category match
    const hasCategoryMatch = grant.cfdaList.some((cfda) =>
      orgCategories.some((cat) => cfda.toLowerCase().includes(cat.toLowerCase()))
    );
    
    // Check title/description for keyword matches
    const titleLower = grant.title.toLowerCase();
    const hasKeywordMatch = orgProfile.programAreas.some((area) => {
      const keywords = area.toLowerCase().split(/[&\s]+/);
      return keywords.some((kw) => kw.length > 3 && titleLower.includes(kw));
    });
    
    if (hasCategoryMatch) {
      score += 20;
    } else if (hasKeywordMatch) {
      score += 15;
    }
  }

  // Organization type / eligibility matching (up to +15 points)
  if (orgProfile.orgType) {
    const eligCodes = ELIGIBILITY_MAPPING[orgProfile.orgType] || ELIGIBILITY_MAPPING["501c3"];
    const eligDescriptions = eligCodes.map((code) => ELIGIBILITY_DESCRIPTIONS[code] || "").filter(Boolean);
    
    // Check if grant is open to this org type
    const isEligible = grant.eligibleApplicants.length === 0 || // No restrictions
      grant.eligibleApplicants.some((ea) => {
        const eaLower = ea.toLowerCase();
        return eligDescriptions.some((ed) => eaLower.includes(ed.toLowerCase())) ||
          eaLower.includes("nonprofit") ||
          eaLower.includes("501(c)(3)") ||
          eaLower.includes("any");
      });
    
    if (isEligible) {
      score += 15;
    }
  } else {
    // No org type specified, assume 501c3 and give partial credit
    score += 10;
  }

  // Funding amount matching (up to +15 points)
  if (grant.awardCeiling > 0) {
    const budgetMax = getBudgetMax(orgProfile.budgetRange);
    const fundingMin = orgProfile.fundingMin || 0;
    const fundingMax = orgProfile.fundingMax || budgetMax;
    
    // Check if grant amount is in desired range
    const grantInRange = 
      (grant.awardFloor <= fundingMax || grant.awardFloor === 0) &&
      (grant.awardCeiling >= fundingMin);
    
    // Check if grant is manageable relative to org budget
    const isManageable = grant.awardCeiling <= budgetMax;
    
    if (grantInRange && isManageable) {
      score += 15;
    } else if (grantInRange || isManageable) {
      score += 8;
    }
  } else {
    // No award info, give partial credit
    score += 5;
  }

  // Cap at 100
  return Math.min(100, Math.max(0, score));
}

function getBudgetMax(budgetRange?: string | null): number {
  if (!budgetRange) return 1000000;
  
  const ranges: Record<string, number> = {
    under_500k: 500000,
    "500k_1m": 1000000,
    "1m_2m": 2000000,
    "2m_5m": 5000000,
    over_5m: 10000000,
  };
  return ranges[budgetRange] || 1000000;
}

/**
 * Build search parameters based on organization profile
 */
export function getSearchParamsForOrg(orgProfile: OrganizationProfile): GrantSearchParams {
  const params: GrantSearchParams = {
    rows: 50,
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

/**
 * Get featured grants - recent high-value opportunities open to nonprofits
 */
export async function getFeaturedGrants(limit: number = 10): Promise<GrantsGovOpportunity[]> {
  const grants = await searchGrants({
    eligibilities: ["25"], // 501(c)(3) eligible
    rows: limit * 2, // Get more to filter
  });
  
  // Sort by award ceiling and return top grants
  return grants
    .filter((g) => g.awardCeiling > 0)
    .sort((a, b) => b.awardCeiling - a.awardCeiling)
    .slice(0, limit);
}
