"use client";

import useSWR from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";
import { Progress } from "@/components/primitives/progress";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function KnowledgeScoreCard() {
  const { data, error } = useSWR("/api/knowledge/score", fetcher, { revalidateOnFocus: false });

  if (error) return null;

  const score = data?.score ?? 0;
  const coverage = data?.coverage ?? 0;
  const freshness = data?.freshness ?? 0;
  const docStrength = data?.docStrength ?? 0;
  // recommendations omitted on dashboard for compactness

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Knowledge Base Strength</CardTitle>
        <CardDescription>How well your docs can support AI drafting</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Overall</span>
            <span className="font-semibold">{score}/100</span>
          </div>
          <Progress value={score} />
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <Metric label="Coverage" value={coverage} />
          <Metric label="Freshness" value={freshness} />
          <Metric label="Doc quality" value={docStrength} />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 rounded-lg bg-surface-subtle border border-border">
      <div className="text-xs text-text-tertiary mb-1">{label}</div>
      <div className="text-base font-semibold">{Math.round(value)} / 100</div>
    </div>
  );
}
