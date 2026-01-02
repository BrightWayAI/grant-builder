"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Shield,
  Mic,
  Loader2,
  ChevronDown,
  ChevronUp,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/primitives/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ClaimSummary {
  total: number;
  verified: number;
  unverified: number;
  highRiskUnverified: number;
}

interface SectionCoverage {
  sectionId: string;
  sectionName: string;
  coverageScore: number;
  claimsSummary?: ClaimSummary;
}

interface ReadinessData {
  overallScore: number;
  claimsVerified: number;
  claimsTotal: number;
  highRiskUnverified: number;
  sectionsWithCoverage: number;
  sectionsTotal: number;
  voiceProfileReady: boolean;
  documentsUsed: number;
  weakSections: SectionCoverage[];
  unverifiedHighRiskClaims: Array<{
    sectionName: string;
    claim: string;
    type: string;
  }>;
}

interface ProposalReadinessCardProps {
  proposalId: string;
  onSectionClick?: (sectionId: string) => void;
  onUploadClick?: () => void;
  compact?: boolean;
}

export function ProposalReadinessCard({
  proposalId,
  onSectionClick,
  onUploadClick,
  compact = false,
}: ProposalReadinessCardProps) {
  const [loading, setLoading] = useState(true);
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchReadiness();
  }, [proposalId]);

  const fetchReadiness = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/proposals/${proposalId}/readiness`);
      if (response.ok) {
        const data = await response.json();
        setReadiness(data);
      }
    } catch (error) {
      console.error("Failed to fetch readiness:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 border rounded-lg bg-background">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!readiness) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 60) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 60) return "bg-green-100";
    if (score >= 40) return "bg-yellow-100";
    return "bg-red-100";
  };

  const getProgressColor = (score: number) => {
    if (score >= 60) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="border rounded-lg bg-background overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg",
                getScoreBg(readiness.overallScore),
                getScoreColor(readiness.overallScore)
              )}
            >
              {readiness.overallScore}
            </div>
            <div>
              <h3 className="font-semibold text-sm">Proposal Readiness</h3>
              <p className="text-xs text-muted-foreground">
                {readiness.overallScore >= 60
                  ? "Ready for export"
                  : readiness.overallScore >= 40
                  ? "Needs attention"
                  : "Not ready"}
              </p>
            </div>
          </div>
          {!compact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full transition-all", getProgressColor(readiness.overallScore))}
              style={{ width: `${readiness.overallScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {/* Claims */}
        <div className="flex items-start gap-2">
          {readiness.claimsTotal > 0 && readiness.highRiskUnverified === 0 ? (
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
          ) : readiness.highRiskUnverified > 0 ? (
            <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
          )}
          <div>
            <p className="text-sm font-medium">
              {readiness.claimsVerified}/{readiness.claimsTotal} claims verified
            </p>
            {readiness.highRiskUnverified > 0 && (
              <p className="text-xs text-red-600">
                {readiness.highRiskUnverified} high-risk unverified
              </p>
            )}
          </div>
        </div>

        {/* Sections */}
        <div className="flex items-start gap-2">
          {readiness.sectionsWithCoverage === readiness.sectionsTotal ? (
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
          )}
          <div>
            <p className="text-sm font-medium">
              {readiness.sectionsWithCoverage}/{readiness.sectionsTotal} sections sourced
            </p>
            {readiness.weakSections.length > 0 && (
              <p className="text-xs text-yellow-600">
                {readiness.weakSections.length} need sources
              </p>
            )}
          </div>
        </div>

        {/* Voice */}
        <div className="flex items-start gap-2">
          {readiness.voiceProfileReady ? (
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
          )}
          <div>
            <p className="text-sm font-medium">Voice profile</p>
            <p className="text-xs text-muted-foreground">
              {readiness.voiceProfileReady ? "Ready" : "Upload 3+ docs"}
            </p>
          </div>
        </div>

        {/* Documents */}
        <div className="flex items-start gap-2">
          <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium">{readiness.documentsUsed} docs</p>
            <p className="text-xs text-muted-foreground">Contributing sources</p>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && !compact && (
        <div className="border-t">
          {/* Weak sections */}
          {readiness.weakSections.length > 0 && (
            <div className="p-4 border-b">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                SECTIONS NEEDING SOURCES
              </h4>
              <div className="space-y-2">
                {readiness.weakSections.map((section) => (
                  <button
                    key={section.sectionId}
                    onClick={() => onSectionClick?.(section.sectionId)}
                    className="w-full flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors text-left"
                  >
                    <span className="text-sm">{section.sectionName}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        section.coverageScore < 30
                          ? "text-red-600 border-red-200"
                          : "text-yellow-600 border-yellow-200"
                      )}
                    >
                      {section.coverageScore}% sourced
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Unverified high-risk claims */}
          {readiness.unverifiedHighRiskClaims.length > 0 && (
            <div className="p-4 border-b">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                UNVERIFIED HIGH-RISK CLAIMS
              </h4>
              <div className="space-y-2">
                {readiness.unverifiedHighRiskClaims.slice(0, 5).map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2 rounded bg-red-50"
                  >
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-900">{item.claim}</p>
                      <p className="text-xs text-red-700">
                        {item.sectionName} · {item.type}
                      </p>
                    </div>
                  </div>
                ))}
                {readiness.unverifiedHighRiskClaims.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{readiness.unverifiedHighRiskClaims.length - 5} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action button */}
          {(readiness.weakSections.length > 0 || !readiness.voiceProfileReady) && (
            <div className="p-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onUploadClick}
                asChild
              >
                <Link href="/knowledge-base">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload documents to improve
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
