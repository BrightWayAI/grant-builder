"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";
import { Label } from "@/components/primitives/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  Search,
  Bookmark,
  BookmarkCheck,
  Download,
  ExternalLink,
  Calendar,
  DollarSign,
  Loader2,
  RefreshCw,
  Building2,
  Settings2,
  Sparkles,
  Filter,
  X,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Grant {
  id: string;
  number: string;
  title: string;
  agency: string;
  publisher?: string;
  agencyCode: string;
  openDate: string;
  closeDate: string | null;
  awardFloor: number;
  awardCeiling: number;
  description: string;
  opportunityCategory: string;
  eligibleApplicants: string[];
  cfdaList: string[];
  matchScore: number;
  isSaved: boolean;
  source?: string;
  url?: string;
  confidence?: string;
}

interface SavedGrant {
  id: string;
  grantId: string;
  title: string;
  funderName: string;
  deadline: string | null;
  awardFloor: number | null;
  awardCeiling: number | null;
  matchScore: number;
  savedAt: string;
}

interface OrgProfile {
  orgType: string | null;
  programAreas: string[];
  budgetRange: string | null;
}

const PROGRAM_AREAS = [
  "Education",
  "Health & Human Services",
  "Arts & Culture",
  "Environment",
  "Community Development",
  "Youth Development",
  "Housing",
  "Workforce Development",
  "Food Security",
  "Mental Health",
  "Disability Services",
  "Senior Services",
];

const ORG_TYPES = [
  { value: "501c3", label: "501(c)(3) Nonprofit" },
  { value: "nonprofit", label: "Other Nonprofit" },
  { value: "government", label: "State/Local Government" },
  { value: "tribal", label: "Tribal Organization" },
  { value: "education", label: "Educational Institution" },
  { value: "small_business", label: "Small Business" },
];

function MatchScoreBadge({ score }: { score: number }) {
  const variant = score >= 70 ? "success" : score >= 50 ? "warning" : "default";
  return (
    <Badge variant={variant} className="font-medium">
      {score}% match
    </Badge>
  );
}

function formatAmount(floor: number | null, ceiling: number | null): string {
  if (ceiling && ceiling > 0) {
    if (floor && floor > 0) {
      return `$${floor.toLocaleString()} - $${ceiling.toLocaleString()}`;
    }
    return `Up to $${ceiling.toLocaleString()}`;
  }
  if (floor && floor > 0) {
    return `From $${floor.toLocaleString()}`;
  }
  return "Amount TBD";
}

export default function DiscoverPage() {
  const [activeTab, setActiveTab] = useState("discover");
  const [grants, setGrants] = useState<Grant[]>([]);
  const [savedGrants, setSavedGrants] = useState<SavedGrant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  
  // Filter state
  const [selectedOrgType, setSelectedOrgType] = useState<string>("");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [orgProfile, setOrgProfile] = useState<OrgProfile | null>(null);
  
  const { toast } = useToast();

  // Load org profile on mount
  useEffect(() => {
    fetchOrgProfile();
    fetchSavedGrants();
  }, []);

  const fetchOrgProfile = async () => {
    try {
      const response = await fetch("/api/organizations");
      if (response.ok) {
        const data = await response.json();
        setOrgProfile(data);
        // Pre-fill filters from profile
        if (data.orgType) setSelectedOrgType(data.orgType);
        if (data.programAreas?.length) setSelectedAreas(data.programAreas);
      }
    } catch (error) {
      console.error("Error fetching org profile:", error);
    }
  };

  const fetchGrants = useCallback(async () => {
    setIsLoading(true);
    setHasSearched(true);
    
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("keyword", searchQuery);
      if (selectedOrgType) params.set("orgType", selectedOrgType);
      if (selectedAreas.length > 0) params.set("areas", selectedAreas.join(","));

      const response = await fetch(`/api/grants/search?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch grants");
      }

      const data = await response.json();
      setGrants(data.grants || []);
      
      if (data.grants?.length > 0) {
        toast({
          title: "Grants found",
          description: `Found ${data.grants.length} matching opportunities`,
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch grants",
        variant: "destructive",
      });
      setGrants([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedOrgType, selectedAreas, toast]);

  const fetchSavedGrants = async () => {
    try {
      const response = await fetch("/api/grants/saved");
      if (response.ok) {
        const data = await response.json();
        setSavedGrants(data.grants || []);
      }
    } catch (error) {
      console.error("Error fetching saved grants:", error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGrants();
  };

  const toggleArea = (area: string) => {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const handleSaveGrant = async (grant: Grant) => {
    try {
      const response = await fetch("/api/grants/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grantId: grant.id,
          title: grant.title,
          funderName: grant.agency,
          deadline: grant.closeDate,
          awardFloor: grant.awardFloor,
          awardCeiling: grant.awardCeiling,
          description: grant.description,
          eligibleTypes: grant.eligibleApplicants,
          categories: [grant.opportunityCategory],
          matchScore: grant.matchScore,
        }),
      });

      if (!response.ok) throw new Error("Failed to save grant");

      setGrants((prev) =>
        prev.map((g) => (g.id === grant.id ? { ...g, isSaved: true } : g))
      );
      fetchSavedGrants();

      toast({ title: "Grant saved", description: "Added to your watchlist" });
    } catch {
      toast({ title: "Error", description: "Failed to save grant", variant: "destructive" });
    }
  };

  const handleUnsaveGrant = async (grantId: string) => {
    try {
      const response = await fetch(`/api/grants/saved?grantId=${grantId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove grant");

      setGrants((prev) =>
        prev.map((g) => (g.id === grantId ? { ...g, isSaved: false } : g))
      );
      setSavedGrants((prev) => prev.filter((g) => g.grantId !== grantId));

      toast({ title: "Grant removed", description: "Removed from watchlist" });
    } catch {
      toast({ title: "Error", description: "Failed to remove grant", variant: "destructive" });
    }
  };

  const handleExport = () => {
    window.open("/api/grants/export", "_blank");
  };

  const clearFilters = () => {
    setSelectedOrgType("");
    setSelectedAreas([]);
    setSearchQuery("");
  };

  const hasFilters = selectedOrgType || selectedAreas.length > 0 || searchQuery;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title">Grant Discovery</h1>
          <p className="text-text-secondary">
            Find federal funding opportunities from Grants.gov
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? "Hide" : "Show"} Filters
          </Button>
          {savedGrants.length > 0 && (
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="discover">
            <Search className="h-4 w-4 mr-2" />
            Discover
          </TabsTrigger>
          <TabsTrigger value="watchlist">
            <Bookmark className="h-4 w-4 mr-2" />
            Watchlist ({savedGrants.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="space-y-4 mt-4">
          {/* Search Criteria Panel */}
          {showFilters && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-brand" />
                    <CardTitle className="text-base">Search Criteria</CardTitle>
                  </div>
                  {hasFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
                <CardDescription>
                  Set your criteria to find matching grants
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Keyword Search */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Keyword Search
                  </Label>
                  <Input
                    placeholder="e.g., climate, workforce, youth programs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Organization Type */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Organization Type
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {ORG_TYPES.map((type) => (
                      <Badge
                        key={type.value}
                        variant={selectedOrgType === type.value ? "default" : "outline"}
                        className="cursor-pointer hover:bg-surface-secondary transition-colors"
                        onClick={() =>
                          setSelectedOrgType(
                            selectedOrgType === type.value ? "" : type.value
                          )
                        }
                      >
                        {type.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Program Areas */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Program Areas
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {PROGRAM_AREAS.map((area) => (
                      <Badge
                        key={area}
                        variant={selectedAreas.includes(area) ? "default" : "outline"}
                        className="cursor-pointer hover:bg-surface-secondary transition-colors"
                        onClick={() => toggleArea(area)}
                      >
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Search Button */}
                <div className="pt-2">
                  <Button
                    onClick={fetchGrants}
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Searching Grants.gov...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Find Matching Grants
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {!hasSearched ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 text-text-disabled mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Ready to discover grants
                </h3>
                <p className="text-text-secondary mb-4">
                  Set your criteria above and click "Find Matching Grants" to search Grants.gov
                </p>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-12 w-12 text-brand mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-medium mb-2">
                  Searching Grants.gov...
                </h3>
                <p className="text-text-secondary">
                  This may take a few seconds
                </p>
              </CardContent>
            </Card>
          ) : grants.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 text-text-disabled mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No grants found</h3>
                <p className="text-text-secondary">
                  Try adjusting your search criteria or using different keywords
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-text-secondary">
                <span>Found {grants.length} opportunities</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchGrants}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
              {grants.map((grant) => (
                <Card key={grant.id} variant="interactive">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-text-primary truncate">
                            {grant.title}
                          </h3>
                          {grant.source && (
                            <Badge variant="secondary" className="text-[11px] capitalize">
                              {humanizeSource(grant.source)}
                            </Badge>
                          )}
                          <MatchScoreBadge score={grant.matchScore} />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-text-secondary mb-2 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {grant.agency}
                          </span>
                          {grant.publisher && (
                            <span className="text-xs text-text-secondary truncate">
                              Source: {grant.publisher}
                            </span>
                          )}
                          {grant.closeDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              Due {formatDate(new Date(grant.closeDate))}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5" />
                            {formatAmount(grant.awardFloor, grant.awardCeiling)}
                          </span>
                        </div>
                        {grant.description && (
                          <p className="text-sm text-text-secondary line-clamp-2">
                            {grant.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            grant.isSaved
                              ? handleUnsaveGrant(grant.id)
                              : handleSaveGrant(grant)
                          }
                        >
                          {grant.isSaved ? (
                            <BookmarkCheck className="h-4 w-4 text-brand" />
                          ) : (
                            <Bookmark className="h-4 w-4" />
                          )}
                        </Button>
                        <a
                          href={grant.url || `https://www.grants.gov/search-results-detail/${grant.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="secondary" size="sm">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="watchlist" className="space-y-4 mt-4">
          {savedGrants.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bookmark className="h-12 w-12 text-text-disabled mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No saved grants</h3>
                <p className="text-text-secondary">
                  Save grants from the Discover tab to build your watchlist
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {savedGrants.map((grant) => (
                <Card key={grant.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-text-primary truncate">
                            {grant.title}
                          </h3>
                          <MatchScoreBadge score={grant.matchScore} />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-text-secondary flex-wrap">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {grant.funderName}
                          </span>
                          {grant.deadline && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              Due {formatDate(new Date(grant.deadline))}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5" />
                            {formatAmount(grant.awardFloor, grant.awardCeiling)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUnsaveGrant(grant.grantId)}
                        >
                          <BookmarkCheck className="h-4 w-4 text-brand" />
                        </Button>
                        <a
                          href={`https://www.grants.gov/search-results-detail/${grant.grantId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="secondary" size="sm">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function humanizeSource(source?: string) {
  if (!source) return "";
  switch (source) {
    case "grants_gov":
      return "Grants.gov";
    case "pnd":
      return "PND";
    case "challenge_gov":
      return "Challenge.gov";
    case "foundation":
      return "Foundation";
    case "csr":
      return "CSR";
    default:
      return source;
  }
}
