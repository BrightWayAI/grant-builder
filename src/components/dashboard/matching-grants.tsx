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

export function MatchingGrantsSection() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchGrants();
  }, []);

  const fetchGrants = async () => {
    try {
      const response = await fetch("/api/grants/search");
      if (!response.ok) throw new Error("Failed to fetch grants");

      const data = await response.json();
      // Show top 5 grants sorted by match score
      setGrants(data.grants.slice(0, 5));
    } catch (err) {
      setError("Unable to load grant recommendations");
      console.error("Error fetching grants:", err);
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
      <div className="text-center py-8">
        <p className="text-text-secondary">{error}</p>
        <Button variant="secondary" size="sm" onClick={fetchGrants} className="mt-2">
          Try Again
        </Button>
      </div>
    );
  }

  if (grants.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-secondary">No matching grants found at this time.</p>
        <Link href="/discover">
          <Button variant="secondary" size="sm" className="mt-2">
            Browse All Grants
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {grants.map((grant) => (
        <div
          key={grant.id}
          className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border hover:border-text-tertiary transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-text-primary truncate">{grant.title}</h4>
              <MatchScoreBadge score={grant.matchScore} />
            </div>
            <div className="flex items-center gap-4 text-sm text-text-secondary">
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
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
