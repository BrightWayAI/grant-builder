"use client";

import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/primitives/card";
import { Progress } from "@/components/primitives/progress";
import { FolderOpen, CheckCircle2, AlertCircle, Circle, ArrowRight } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function KnowledgeScoreCard() {
  const { data, error } = useSWR("/api/knowledge-base/semantic-score", fetcher, { revalidateOnFocus: false });

  if (error) return null;

  const score = data?.overallScore ?? 0;
  const docCount = data?.documentCount ?? 0;
  const topCategories = data?.categoryScores?.slice(0, 3) ?? [];

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Beacon Readiness Index</CardTitle>
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
              : cat.confidence === "medium" ? CheckCircle2
              : cat.confidence === "low" ? AlertCircle 
              : Circle;
            const color = cat.confidence === "high" ? "text-status-success" 
              : cat.confidence === "medium" ? "text-yellow-500"
              : cat.confidence === "low" ? "text-orange-500" 
              : "text-border";
            return (
              <div key={cat.id} className="flex items-center gap-2 text-xs">
                <Icon className={`h-3.5 w-3.5 ${color}`} />
                <span className="text-text-secondary flex-1 truncate">{cat.label}</span>
                <span className="text-[10px] text-text-tertiary">{cat.score}%</span>
              </div>
            );
          })}
        </div>

        {/* Document count */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-text-tertiary">{docCount} documents</span>
          <Link href="/knowledge-base" className="text-brand text-xs hover:underline inline-flex items-center">
            Manage <ArrowRight className="h-3 w-3 ml-0.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
