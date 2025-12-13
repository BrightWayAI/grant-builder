// Grants.gov API integration
// Using the public search and detail APIs

const GRANTS_GOV_SEARCH_URL = "https://www.grants.gov/grantsws/rest/opportunities/search";
const GRANTS_GOV_DETAIL_URL = "https://apply07.grants.gov/grantsws/rest/opportunity/details";

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
  docType: string;
  cfdaList?: string[];
}

interface GrantsGovSearchResponse {
  oppHits?: GrantsGovHit[];
  hitCount?: number;
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
 * Returns grants with details fetched for top results
 */
export async function searchGrants(params: GrantSearchParams = {}): Promise<GrantsGovOpportunity[]> {
  const rows = params.rows || 25;
  
  // Try with filters first
  let hits = await executeSearch(params, rows);
  
  // If no results with filters, try broader search
  if (hits.length === 0 && (params.fundingCategories || params.eligibilities || params.keyword)) {
    console.log("No results with filters, trying broader search...");
    hits = await executeSearch({}, rows);
  }
  
  if (hits.length === 0) {
    return [];
  }
  
  // Fetch details for grants (limit to avoid rate limiting)
  const detailLimit = Math.min(hits.length, 12);
  const grants: GrantsGovOpportunity[] = [];
  
  for (let i = 0; i < detailLimit; i++) {
    const hit = hits[i];
    try {
      const detail = await getGrantDetail(hit.id);
      if (detail) {
        grants.push(detail);
      } else {
        // Fallback to basic info from search
        grants.push(hitToBasicGrant(hit));
      }
    } catch (err) {
      console.error(`Error fetching detail for ${hit.id}:`, err);
      grants.push(hitToBasicGrant(hit));
    }
    
    // Small delay between requests to avoid rate limiting
    if (i < detailLimit - 1) {
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }
  
  return grants;
}

function hitToBasicGrant(hit: GrantsGovHit): GrantsGovOpportunity {
  return {
    id: hit.id,
    number: hit.number,
    title: hit.title,
    agency: hit.agency,
    agencyCode: hit.agencyCode,
    openDate: hit.openDate,
    closeDate: hit.closeDate || null,
    awardFloor: 0,
    awardCeiling: 0,
    description: "",
    opportunityCategory: "",
    eligibleApplicants: [],
    cfdaList: hit.cfdaList || [],
  };
}

async function executeSearch(params: GrantSearchParams, rows: number): Promise<GrantsGovHit[]> {
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

    console.log("Searching Grants.gov with params:", JSON.stringify(searchBody));

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
      console.error(`Grants.gov API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data: GrantsGovSearchResponse = await response.json();
    
    console.log(`Grants.gov returned ${data.hitCount || 0} total hits, ${data.oppHits?.length || 0} in response`);
    
    return data.oppHits || [];
  } catch (error) {
    console.error("Error searching Grants.gov:", error);
    return [];
  }
}

/**
 * Get detailed information about a specific grant
 * Uses POST to apply07.grants.gov with form-encoded data
 */
export async function getGrantDetail(opportunityId: string): Promise<GrantsGovOpportunity | null> {
  try {
    const response = await fetch(GRANTS_GOV_DETAIL_URL, {
      method: "POST",
      headers: { 
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `oppId=${opportunityId}`,
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Detail fetch failed for ${opportunityId}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    // Check for errors
    if (data.errorMessages && data.errorMessages.length > 0) {
      console.error(`Grant ${opportunityId} errors:`, data.errorMessages);
      return null;
    }

    const synopsis = data.synopsis || {};
    
    // Parse award amounts - they could be numbers or strings like "none"
    let awardCeiling = 0;
    let awardFloor = 0;
    if (synopsis.awardCeiling && synopsis.awardCeiling !== "none") {
      awardCeiling = parseInt(String(synopsis.awardCeiling), 10) || 0;
    }
    if (synopsis.awardFloor && synopsis.awardFloor !== "none") {
      awardFloor = parseInt(String(synopsis.awardFloor), 10) || 0;
    }
    
    // Extract eligibility types
    const eligibleApplicants = (synopsis.applicantTypes || []).map(
      (t: { description?: string }) => t.description || ""
    ).filter(Boolean);

    // Extract CFDA numbers
    const cfdaList = (data.cfdas || []).map(
      (c: { programNumber?: string }) => c.programNumber || ""
    ).filter(Boolean);

    return {
      id: String(data.id || opportunityId),
      number: data.opportunityNumber || "",
      title: data.opportunityTitle || "Untitled Grant",
      agency: synopsis.agencyName || "Unknown Agency",
      agencyCode: synopsis.agencyCode || data.owningAgencyCode || "",
      openDate: synopsis.postingDate || "",
      closeDate: synopsis.responseDate || synopsis.archiveDate || null,
      awardFloor,
      awardCeiling,
      description: synopsis.synopsisDesc || synopsis.fundingActivityCategoryDesc || "",
      opportunityCategory: data.opportunityCategory?.description || "",
      eligibleApplicants,
      cfdaList,
    };
  } catch (error) {
    console.error(`Error fetching grant detail for ${opportunityId}:`, error);
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
    const descLower = (grant.description || "").toLowerCase();
    const hasKeywordMatch = orgProfile.programAreas.some((area) => {
      const keywords = area.toLowerCase().split(/[&\s]+/);
      return keywords.some((kw) => kw.length > 3 && (titleLower.includes(kw) || descLower.includes(kw)));
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
          eaLower.includes("any") ||
          eaLower.includes("other");
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
    rows: 25,
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
