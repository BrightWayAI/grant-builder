import { GrantsGovOpportunity, searchGrants as searchGrantsGov } from "./grants-gov";

export type GrantSource = "grants_gov" | "pnd" | "challenge_gov" | "foundation" | "csr";

export interface UnifiedOpportunity extends GrantsGovOpportunity {
  source: GrantSource;
  url?: string;
  confidence?: "high" | "medium" | "low";
  publisher?: string;
}

export interface SearchFilters {
  keyword?: string;
  fundingCategories?: string[];
  eligibilities?: string[];
  rows?: number;
}

// --- Public feeds ---

export async function fetchPNDRfps(limit = 15): Promise<UnifiedOpportunity[]> {
  try {
    const res = await fetch("https://philanthropynewsdigest.org/rfps/rss", { cache: "no-store" });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g)).slice(0, limit);
    return items.map((match, idx) => {
      const block = match[1];
      const title = getTag(block, "title") || "PND RFP";
      const link = getTag(block, "link") || "";
      const pubDate = getTag(block, "pubDate") || new Date().toISOString();
      const description = (getTag(block, "description") || "").replace(/<[^>]+>/g, "").trim();
      return {
        source: "pnd" as const,
        id: `pnd-${idx}-${link}`,
        number: "PND",
        title,
        agency: "Philanthropy News Digest",
        agencyCode: "PND",
        openDate: pubDate,
        closeDate: null,
        awardFloor: 0,
        awardCeiling: 0,
        description,
        opportunityCategory: "Foundation",
        eligibleApplicants: [],
        cfdaList: [],
        url: link,
        confidence: "medium",
        publisher: "PND RFP Listing",
      };
    });
  } catch {
    return [];
  }
}

export async function fetchChallengeGov(limit = 20): Promise<UnifiedOpportunity[]> {
  try {
    const res = await fetch("https://api.challenge.gov/v1/opportunities?status=open", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data?.results) ? data.results.slice(0, limit) : [];
    return items.map((item: any, idx: number) => {
      const id = String(item.id || idx);
      return {
        source: "challenge_gov" as const,
        id: `challenge-${id}`,
        number: item.challenge_number || id,
        title: item.title || "Challenge.gov Opportunity",
        agency: item.agency || item.agency_name || "Challenge.gov",
        agencyCode: item.agency_abbreviation || "CHLG",
        openDate: item.open_date || item.published_at || "",
        closeDate: item.close_date || item.closed_at || null,
        awardFloor: item.prize_floor || 0,
        awardCeiling: item.prize_amount || 0,
        description: item.summary || "",
        opportunityCategory: "Challenge",
        eligibleApplicants: [],
        cfdaList: [],
        url: item.url || item.challenge_url || "",
        confidence: "medium",
        publisher: "Challenge.gov",
      };
    });
  } catch {
    return [];
  }
}

// --- Curated static sources ---

const FOUNDATION_CURATED: UnifiedOpportunity[] = [
  {
    source: "foundation",
    id: "ford-bridge",
    number: "FORD-OPEN",
    title: "Ford Foundation - Open Grants",
    agency: "Ford Foundation",
    agencyCode: "FORD",
    openDate: "",
    closeDate: null,
    awardFloor: 0,
    awardCeiling: 0,
    description: "Open opportunities and rolling invitations for social justice initiatives.",
    opportunityCategory: "Foundation",
    eligibleApplicants: [],
    cfdaList: [],
    url: "https://www.fordfoundation.org/work/our-grants/",
    confidence: "medium",
    publisher: "Foundation Portal",
  },
  {
    source: "foundation",
    id: "kresge-opportunities",
    number: "KRESGE-OPEN",
    title: "Kresge Foundation - Funding Opportunities",
    agency: "Kresge Foundation",
    agencyCode: "KRESGE",
    openDate: "",
    closeDate: null,
    awardFloor: 0,
    awardCeiling: 0,
    description: "Community development, health, education, and arts & culture funding windows.",
    opportunityCategory: "Foundation",
    eligibleApplicants: [],
    cfdaList: [],
    url: "https://kresge.org/working-with-us/funding-opportunities/",
    confidence: "medium",
    publisher: "Foundation Portal",
  },
  {
    source: "foundation",
    id: "macarthur-100",
    number: "MACARTHUR-100",
    title: "MacArthur 100&Change / Major Initiatives",
    agency: "MacArthur Foundation",
    agencyCode: "MAC",
    openDate: "",
    closeDate: null,
    awardFloor: 0,
    awardCeiling: 0,
    description: "Flagship competition and major initiatives; check site for current cycle.",
    opportunityCategory: "Foundation",
    eligibleApplicants: [],
    cfdaList: [],
    url: "https://www.macfound.org/",
    confidence: "low",
    publisher: "Foundation Portal",
  },
];

const CSR_CURATED: UnifiedOpportunity[] = [
  {
    source: "csr",
    id: "walmart-community",
    number: "WMT-COMMUNITY",
    title: "Walmart Local Community Grants",
    agency: "Walmart Foundation",
    agencyCode: "WMT",
    openDate: "",
    closeDate: null,
    awardFloor: 250,
    awardCeiling: 5000,
    description: "Local community grants for nonprofits; multiple cycles annually.",
    opportunityCategory: "Corporate",
    eligibleApplicants: [],
    cfdaList: [],
    url: "https://walmart.org/how-we-give/local-community-grants",
    confidence: "high",
    publisher: "CSR Portal",
  },
  {
    source: "csr",
    id: "target-grants",
    number: "TARGET-COMMUNITY",
    title: "Target Community Engagement Funding",
    agency: "Target Foundation",
    agencyCode: "TARGET",
    openDate: "",
    closeDate: null,
    awardFloor: 0,
    awardCeiling: 0,
    description: "Community impact and engagement grants; cycles vary by region.",
    opportunityCategory: "Corporate",
    eligibleApplicants: [],
    cfdaList: [],
    url: "https://corporate.target.com/sustainability-ESG/community/",
    confidence: "medium",
    publisher: "CSR Portal",
  },
  {
    source: "csr",
    id: "microsoft-tech",
    number: "MSFT-PHIL",
    title: "Microsoft Philanthropies Grants & Tech for Social Impact",
    agency: "Microsoft Philanthropies",
    agencyCode: "MSFT",
    openDate: "",
    closeDate: null,
    awardFloor: 0,
    awardCeiling: 0,
    description: "Technology grants and social impact funding for nonprofits.",
    opportunityCategory: "Corporate",
    eligibleApplicants: [],
    cfdaList: [],
    url: "https://www.microsoft.com/nonprofits",
    confidence: "medium",
    publisher: "CSR Portal",
  },
];

// --- Aggregator ---

export async function searchAllSources(filters: SearchFilters): Promise<UnifiedOpportunity[]> {
  const grantsGovPromise = searchGrantsGov(filters);
  const pndPromise = fetchPNDRfps();
  const challengePromise = fetchChallengeGov();

  const [grantsGov, pnd, challenge] = await Promise.all([grantsGovPromise, pndPromise, challengePromise]);

  const staticAll = [...FOUNDATION_CURATED, ...CSR_CURATED];

  // Optional keyword filter for static and feeds
  const keyword = filters.keyword?.toLowerCase();
  const keywordFilter = (g: UnifiedOpportunity) => {
    if (!keyword) return true;
    return (
      g.title.toLowerCase().includes(keyword) ||
      (g.description || "").toLowerCase().includes(keyword) ||
      (g.agency || "").toLowerCase().includes(keyword)
    );
  };

  const feedFiltered = [...pnd, ...challenge].filter(keywordFilter);
  const staticFiltered = staticAll.filter(keywordFilter);

  return [
    ...grantsGov.map((g) => ({ ...g, source: "grants_gov" as const })),
    ...feedFiltered,
    ...staticFiltered,
  ];
}

function getTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}>([\s\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1].trim() : null;
}
