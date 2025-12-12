"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";
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
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Grant {
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
  matchScore: number;
  isSaved: boolean;
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

function MatchScoreBadge({ score }: { score: number }) {
  const variant = score >= 70 ? "success" : score >= 40 ? "warning" : "default";
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchGrants();
    fetchSavedGrants();
  }, []);

  const fetchGrants = async (keyword?: string) => {
    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.set("keyword", keyword);

      const response = await fetch(`/api/grants/search?${params}`);
      if (!response.ok) throw new Error("Failed to fetch grants");

      const data = await response.json();
      setGrants(data.grants);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch grant opportunities",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  };

  const fetchSavedGrants = async () => {
    try {
      const response = await fetch("/api/grants/saved");
      if (!response.ok) throw new Error("Failed to fetch saved grants");

      const data = await response.json();
      setSavedGrants(data.grants);
    } catch (error) {
      console.error("Error fetching saved grants:", error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGrants(searchQuery);
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

      // Update local state
      setGrants((prev) =>
        prev.map((g) => (g.id === grant.id ? { ...g, isSaved: true } : g))
      );
      fetchSavedGrants();

      toast({
        title: "Grant saved",
        description: "Added to your watchlist",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save grant",
        variant: "destructive",
      });
    }
  };

  const handleUnsaveGrant = async (grantId: string) => {
    try {
      const response = await fetch(`/api/grants/saved?grantId=${grantId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove grant");

      // Update local state
      setGrants((prev) =>
        prev.map((g) => (g.id === grantId ? { ...g, isSaved: false } : g))
      );
      setSavedGrants((prev) => prev.filter((g) => g.grantId !== grantId));

      toast({
        title: "Grant removed",
        description: "Removed from your watchlist",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove grant",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    window.open("/api/grants/export", "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title">Grant Discovery</h1>
          <p className="text-text-secondary">
            Find funding opportunities matched to your organization
          </p>
        </div>
        {savedGrants.length > 0 && (
          <Button variant="secondary" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Watchlist
          </Button>
        )}
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
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Search by keyword, agency, or program..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isSearching}>
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSearchQuery("");
                fetchGrants();
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </form>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
            </div>
          ) : grants.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 text-text-disabled mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No grants found</h3>
                <p className="text-text-secondary">
                  Try adjusting your search or update your organization profile for better matches.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {grants.map((grant) => (
                <Card key={grant.id} variant="interactive">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-text-primary truncate">
                            {grant.title}
                          </h3>
                          <MatchScoreBadge score={grant.matchScore} />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-text-secondary mb-2">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {grant.agency}
                          </span>
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
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            grant.isSaved
                              ? handleUnsaveGrant(grant.id)
                              : handleSaveGrant(grant)
                          }
                          title={grant.isSaved ? "Remove from watchlist" : "Add to watchlist"}
                        >
                          {grant.isSaved ? (
                            <BookmarkCheck className="h-4 w-4 text-brand" />
                          ) : (
                            <Bookmark className="h-4 w-4" />
                          )}
                        </Button>
                        <a
                          href={`https://www.grants.gov/search-results-detail/${grant.id}`}
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
                  Save grants from the Discover tab to build your watchlist.
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
                        <div className="flex items-center gap-4 text-sm text-text-secondary">
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
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUnsaveGrant(grant.grantId)}
                          title="Remove from watchlist"
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
