"use client";

import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";
import { Progress } from "@/components/primitives/progress";
import { FolderOpen, CheckCircle2, AlertCircle, XCircle, ArrowRight } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function KnowledgeScoreCard() {
  const { data, error } = useSWR("/api/knowledge-base/semantic-score", fetcher, { revalidateOnFocus: false });

  if (error) return null;

  const score = data?.overallScore ?? 0;
  const strongCount = data?.strongAreas?.length ?? 0;
  const weakCount = data?.weakAreas?.length ?? 0;
  const docCount = data?.documentCount ?? 0;
  const topCategories = data?.categoryScores?.slice(0, 3) ?? [];

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Knowledge Health</CardTitle>
        <FolderOpen className="h-5 w-5 text-text-tertiary" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-text-secondary">Overall readiness</span>
            <span className="font-semibold">{score}/100</span>
          </div>
          <Progress value={score} />
        </div>

        {/* Top categories */}
        <div className="space-y-1">
          {topCategories.map((cat: { id: string; label: string; score: number; confidence: string }) => {
            const Icon = cat.confidence === "high" ? CheckCircle2 
              : cat.confidence === "none" ? XCircle 
              : AlertCircle;
            const color = cat.confidence === "high" ? "text-status-success" 
              : cat.confidence === "none" ? "text-status-error" 
              : "text-status-warning";
            return (
              <div key={cat.id} className="flex items-center gap-2 text-sm">
                <Icon className={`h-3.5 w-3.5 ${color}`} />
                <span className="text-text-primary flex-1 truncate">{cat.label}</span>
                <span className="text-xs text-text-tertiary">{cat.score}%</span>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="flex items-center gap-2 pt-1">
          {strongCount > 0 && (
            <Badge variant="success" className="text-[10px]">{strongCount} strong</Badge>
          )}
          {weakCount > 0 && (
            <Badge variant="error" className="text-[10px]">{weakCount} gaps</Badge>
          )}
          <span className="text-xs text-text-tertiary ml-auto">{docCount} docs</span>
        </div>

        <Link href="/knowledge-base" className="text-brand text-sm hover:underline inline-flex items-center">
          Manage KB <ArrowRight className="h-3 w-3 ml-1" />
        </Link>
      </CardContent>
    </Card>
  );
}
