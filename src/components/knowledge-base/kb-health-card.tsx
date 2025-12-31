"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Brain,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  FileText,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  RefreshCw,
} from "lucide-react";

interface CategoryScore {
  id: string;
  label: string;
  score: number;
  confidence: "high" | "medium" | "low" | "none";
  topChunks: {
    content: string;
    documentName: string;
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

function getScoreColor(score: number) {
  if (score >= 70) return "text-green-600";
  if (score >= 50) return "text-yellow-600";
  if (score >= 30) return "text-orange-600";
  return "text-red-600";
}

function getScoreBg(score: number) {
  if (score >= 70) return "bg-green-500";
  if (score >= 50) return "bg-yellow-500";
  if (score >= 30) return "bg-orange-500";
  return "bg-red-500";
}

function getConfidenceConfig(confidence: string) {
  switch (confidence) {
    case "high":
      return { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", label: "Strong" };
    case "medium":
      return { icon: AlertCircle, color: "text-yellow-600", bg: "bg-yellow-50", label: "Adequate" };
    case "low":
      return { icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50", label: "Weak" };
    default:
      return { icon: XCircle, color: "text-red-600", bg: "bg-red-50", label: "Missing" };
  }
}

export function KBHealthCard() {
  const [score, setScore] = useState<SemanticKBScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showAllCategories, setShowAllCategories] = useState(false);

  const fetchScore = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/knowledge-base/semantic-score");
      if (res.ok) {
        const data = await res.json();
        setScore(data);
      }
    } catch (error) {
      console.error("Failed to fetch KB score:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchScore();
  }, []);

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Analyzing knowledge base...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!score) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Unable to analyze knowledge base</p>
          <Button variant="ghost" size="sm" onClick={() => fetchScore()} className="mt-2">
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const displayedCategories = showAllCategories
    ? score.categoryScores
    : score.categoryScores.slice(0, 4);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Knowledge Base Health
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchScore(true)}
            disabled={refreshing}
            className="h-8 px-2"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20">
            <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${score.overallScore}, 100`}
                className={getScoreColor(score.overallScore)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn("text-2xl font-bold", getScoreColor(score.overallScore))}>
                {score.overallScore}
              </span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">
              {score.overallScore >= 70 ? "Strong Foundation" :
               score.overallScore >= 50 ? "Adequate Coverage" :
               score.overallScore >= 30 ? "Needs Improvement" : "Critical Gaps"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {score.documentCount} documents indexed
            </p>
            <div className="flex gap-2 mt-2">
              {score.strongAreas.length > 0 && (
                <Badge variant="outline" className="text-[10px] py-0 text-green-600 border-green-200">
                  <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                  {score.strongAreas.length} strong
                </Badge>
              )}
              {score.weakAreas.length > 0 && (
                <Badge variant="outline" className="text-[10px] py-0 text-red-600 border-red-200">
                  <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
                  {score.weakAreas.length} gaps
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Topic Coverage
          </p>
          <div className="divide-y">
            {displayedCategories.map((category) => {
              const config = getConfidenceConfig(category.confidence);
              const Icon = config.icon;
              const isExpanded = expandedCategories.has(category.id);

              return (
                <div key={category.id}>
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full py-2 flex items-center gap-2 hover:bg-muted/50 transition-colors rounded -mx-1 px-1"
                  >
                    <Icon className={cn("h-4 w-4 flex-shrink-0", config.color)} />
                    <span className="text-sm flex-1 text-left">{category.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", getScoreBg(category.score))}
                          style={{ width: `${category.score}%` }}
                        />
                      </div>
                      <span className={cn("text-xs font-medium w-8 text-right", getScoreColor(category.score))}>
                        {category.score}%
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="pb-2 pl-6 space-y-2">
                      {category.topChunks.length > 0 ? (
                        <>
                          <p className="text-xs text-muted-foreground">Best matches:</p>
                          {category.topChunks.map((chunk, idx) => (
                            <div key={idx} className="text-xs p-2 bg-muted/50 rounded">
                              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                                <FileText className="h-3 w-3" />
                                <span className="truncate">{chunk.documentName}</span>
                                <span className="ml-auto">{Math.round(chunk.similarity * 100)}%</span>
                              </div>
                              <p className="text-foreground line-clamp-2">{chunk.content}</p>
                            </div>
                          ))}
                        </>
                      ) : (
                        <p className="text-xs text-red-600">
                          No relevant content found in your knowledge base
                        </p>
                      )}
                      {category.recommendation && (
                        <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 p-2 rounded">
                          <Lightbulb className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                          <span>{category.recommendation}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {score.categoryScores.length > 4 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="w-full text-xs h-7 mt-1"
            >
              {showAllCategories ? "Show less" : `Show ${score.categoryScores.length - 4} more topics`}
            </Button>
          )}
        </div>

        {/* Recommendations */}
        {score.recommendations.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Priority Actions
            </p>
            <div className="space-y-1.5">
              {score.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 text-xs p-2 bg-blue-50 text-blue-800 rounded"
                >
                  <span className="font-semibold">{idx + 1}.</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
