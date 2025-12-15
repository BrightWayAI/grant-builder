"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/primitives/button";
import { Badge } from "@/components/primitives/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Calendar,
  DollarSign,
  Building2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Grant {
  id: string;
  title: string;
  agency: string;
  closeDate: string | null;
  awardFloor: number;
  awardCeiling: number;
  matchScore: number;
  isSaved: boolean;
  description: string;
  eligibleApplicants: string[];
  opportunityCategory: string;
  source?: string;
  url?: string;
  publisher?: string;
}

function MatchScoreBadge({ score }: { score: number }) {
  const variant = score >= 70 ? "success" : score >= 50 ? "warning" : "default";
  return (
    <Badge variant={variant} className="font-medium text-xs">
      {score}%
    </Badge>
  );
}

function formatAmount(floor: number | null, ceiling: number | null): string {
  if (ceiling && ceiling > 0) {
    return `$${(ceiling / 1000).toFixed(0)}K`;
  }
  if (floor && floor > 0) {
    return `$${(floor / 1000).toFixed(0)}K+`;
  }
  return "TBD";
}

export function MatchingGrantsSection() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchGrants();
  }, []);

  const fetchGrants = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/grants/search?featured=true");
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch grants");
      }

      const data = await response.json();
      // Show top 5 grants sorted by match score
      setGrants(data.grants?.slice(0, 5) || []);
    } catch (err) {
      console.error("Error fetching grants:", err);
      setError(err instanceof Error ? err.message : "Unable to load grants");
    } finally {
      setIsLoading(false);
    }
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

      toast({
        title: "Grant saved",
        description: "Added to your watchlist",
      });
    } catch {
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

      setGrants((prev) =>
        prev.map((g) => (g.id === grantId ? { ...g, isSaved: false } : g))
      );

      toast({
        title: "Grant removed",
        description: "Removed from your watchlist",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to remove grant",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
        <span className="ml-2 text-text-secondary">Finding matching grants...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="h-8 w-8 text-status-warning mb-2" />
        <p className="text-text-secondary mb-2">{error}</p>
        <Button variant="secondary" size="sm" onClick={fetchGrants}>
          Try Again
        </Button>
      </div>
    );
  }

  if (grants.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-secondary mb-3">No grants found at this time. Check back soon!</p>
        <Link href="/discover">
          <Button variant="secondary" size="sm">
            Browse All Grants
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {grants.map((grant) => (
        <div
          key={grant.id}
          className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:border-text-tertiary transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h4 className="font-medium text-text-primary text-sm truncate flex-1">
                {grant.title}
              </h4>
            {grant.source && (
              <Badge variant="secondary" className="text-[10px] capitalize">
                {humanizeSource(grant.source)}
              </Badge>
            )}
              <MatchScoreBadge score={grant.matchScore} />
            </div>
            <div className="flex items-center gap-3 text-xs text-text-secondary">
              <span className="flex items-center gap-1 truncate">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{grant.agency}</span>
              </span>
              {grant.publisher && (
                <span className="flex items-center gap-1 truncate">
                  <span className="text-[11px] text-text-secondary">{grant.publisher}</span>
                </span>
              )}
              {grant.closeDate && (
                <span className="flex items-center gap-1 flex-shrink-0">
                  <Calendar className="h-3 w-3" />
                  {formatDate(new Date(grant.closeDate))}
                </span>
              )}
              <span className="flex items-center gap-1 flex-shrink-0">
                <DollarSign className="h-3 w-3" />
                {formatAmount(grant.awardFloor, grant.awardCeiling)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                grant.isSaved
                  ? handleUnsaveGrant(grant.id)
                  : handleSaveGrant(grant)
              }
              title={grant.isSaved ? "Remove from watchlist" : "Save to watchlist"}
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
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      ))}
      
      <div className="pt-2 text-center">
        <Link href="/discover">
          <Button variant="link" size="sm" className="text-brand">
            View all opportunities →
          </Button>
        </Link>
      </div>
    </div>
  );
}

function humanizeSource(source: string) {
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
