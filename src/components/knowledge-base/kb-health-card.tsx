"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";
import { Button } from "@/components/primitives/button";
import { Progress } from "@/components/primitives/progress";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  AlertCircle,
  Circle,
  ChevronDown,
  ChevronRight,
  Loader2,
  FileText,
  FolderOpen,
  ArrowRight,
} from "lucide-react";

interface CategoryScore {
  id: string;
  label: string;
  score: number;
  confidence: "high" | "medium" | "low" | "none";
  topChunks: {
    content: string;
    documentName: string;
    documentType?: string;
    similarity: number;
  }[];
  recommendation?: string;
}

interface SemanticKBScore {
  overallScore: number;
  categoryScores: CategoryScore[];
  strongAreas: string[];
  weakAreas: string[];
  recommendations: string[];
  documentCount: number;
  lastUpdated: string | null;
}

function getConfidenceIcon(confidence: string) {
  switch (confidence) {
    case "high":
      return { icon: CheckCircle2, color: "text-status-success" };
    case "medium":
      return { icon: CheckCircle2, color: "text-yellow-500" };
    case "low":
      return { icon: AlertCircle, color: "text-orange-500" };
    default:
      return { icon: Circle, color: "text-border" };
  }
}

function formatDocType(type?: string): string {
  if (!type) return "Doc";
  const labels: Record<string, string> = {
    PROPOSAL: "Proposal",
    ORG_OVERVIEW: "Org Overview",
    PROGRAM_DESCRIPTION: "Program",
    IMPACT_REPORT: "Impact",
    LOGIC_MODEL: "Logic Model",
    AUDITED_FINANCIALS: "Financials",
    FORM_990: "990",
    ANNUAL_REPORT: "Annual Report",
    STAFF_BIOS: "Staff",
    BOARD_BIOS: "Board",
    BOILERPLATE: "Boilerplate",
    OTHER: "Other",
  };
  return labels[type] || type.replace(/_/g, " ");
}

export function KBHealthCard() {
  const [score, setScore] = useState<SemanticKBScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/knowledge-base/semantic-score")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setScore(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="pt-6 flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
        </CardContent>
      </Card>
    );
  }

  if (!score) {
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">Knowledge Health</CardTitle>
          <FolderOpen className="h-5 w-5 text-text-tertiary" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary">Unable to analyze</p>
        </CardContent>
      </Card>
    );
  }

  // Show top 4 categories for compact view
  const topCategories = score.categoryScores.slice(0, 4);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Knowledge Health</CardTitle>
        <FolderOpen className="h-5 w-5 text-text-tertiary" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">Overall readiness</span>
            <span className="text-sm font-semibold">{score.overallScore}/100</span>
          </div>
          <Progress value={score.overallScore} />
        </div>

        {/* Category Breakdown */}
        <div className="space-y-1">
          {topCategories.map((category) => {
            const { icon: Icon, color } = getConfidenceIcon(category.confidence);
            const isExpanded = expandedCategory === category.id;

            return (
              <div key={category.id}>
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                  className="w-full py-1.5 flex items-center gap-2 text-left hover:bg-surface-subtle rounded transition-colors"
                >
                  <Icon className={cn("h-4 w-4 flex-shrink-0", color)} />
                  <span className="text-xs text-text-secondary flex-1 truncate">{category.label}</span>
                  <span className="text-[10px] text-text-tertiary w-8 text-right">{category.score}%</span>
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-text-tertiary" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-text-tertiary" />
                  )}
                </button>

                {isExpanded && (
                  <div className="ml-6 mb-2 space-y-1.5">
                    <p className="text-[10px] text-text-tertiary">
                      Best matches for "{category.label}" questions:
                    </p>
                    {category.topChunks.length > 0 ? (
                      category.topChunks.slice(0, 2).map((chunk, idx) => (
                        <div key={idx} className="text-xs p-2 bg-surface-subtle rounded border border-border">
                          <div className="flex items-center gap-1 text-text-tertiary mb-1">
                            <FileText className="h-3 w-3" />
                            <span className="truncate flex-1">{chunk.documentName}</span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0">
                              {formatDocType(chunk.documentType)}
                            </Badge>
                            <span>{Math.round(chunk.similarity * 100)}%</span>
                          </div>
                          <p className="text-text-secondary line-clamp-2">{chunk.content}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-status-error p-2">No matching content found</p>
                    )}
                    {category.recommendation && (
                      <p className="text-xs text-text-secondary italic">{category.recommendation}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Document count */}
        <div className="flex items-center justify-end pt-1">
          <span className="text-xs text-text-tertiary">{score.documentCount} documents analyzed</span>
        </div>

        {/* Top recommendation */}
        {score.recommendations.length > 0 && (
          <div className="text-xs text-text-secondary border-t border-border pt-3">
            <span className="font-medium">Next step:</span> {score.recommendations[0]}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
