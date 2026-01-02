"use client";

import { Progress } from "@/components/primitives/progress";
import { Badge } from "@/components/primitives/badge";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  sectionName: string;
  content: string;
  wordLimit: number | null;
  isRequired: boolean;
}

interface ProposalProgressProps {
  sections: Section[];
  compact?: boolean;
}

function countWords(text: string): number {
  if (!text) return 0;
  const stripped = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!stripped) return 0;
  return stripped.split(" ").filter(Boolean).length;
}

function getSectionStatus(section: Section): "complete" | "partial" | "empty" | "over" {
  const wordCount = countWords(section.content);
  if (wordCount === 0) return "empty";
  if (section.wordLimit && wordCount > section.wordLimit) return "over";
  if (section.wordLimit && wordCount >= section.wordLimit * 0.5) return "complete";
  if (wordCount > 50) return "complete";
  return "partial";
}

export function ProposalProgress({ sections, compact = false }: ProposalProgressProps) {
  const completedSections = sections.filter(s => {
    const status = getSectionStatus(s);
    return status === "complete" || status === "over";
  }).length;
  
  const requiredSections = sections.filter(s => s.isRequired);
  const completedRequired = requiredSections.filter(s => {
    const status = getSectionStatus(s);
    return status === "complete" || status === "over";
  }).length;

  const progressPercent = sections.length > 0 
    ? Math.round((completedSections / sections.length) * 100) 
    : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Progress value={progressPercent} className="h-1.5 w-16" />
        <span className="text-xs text-text-tertiary">
          {completedSections}/{sections.length}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Progress</span>
        <span className="text-sm text-text-secondary">{progressPercent}%</span>
      </div>
      <Progress value={progressPercent} className="h-2" />
      <div className="flex items-center gap-4 text-xs text-text-secondary">
        <span>{completedSections} of {sections.length} sections</span>
        {requiredSections.length > 0 && (
          <span className={cn(
            completedRequired < requiredSections.length && "text-status-warning"
          )}>
            {completedRequired}/{requiredSections.length} required
          </span>
        )}
      </div>
    </div>
  );
}

export function SectionProgressList({ sections }: { sections: Section[] }) {
  return (
    <div className="space-y-1">
      {sections.map((section) => {
        const status = getSectionStatus(section);
        const wordCount = countWords(section.content);
        
        return (
          <div key={section.id} className="flex items-center gap-2 py-1">
            {status === "complete" && (
              <CheckCircle2 className="h-4 w-4 text-status-success flex-shrink-0" />
            )}
            {status === "partial" && (
              <AlertCircle className="h-4 w-4 text-status-warning flex-shrink-0" />
            )}
            {status === "empty" && (
              <Circle className="h-4 w-4 text-text-disabled flex-shrink-0" />
            )}
            {status === "over" && (
              <AlertCircle className="h-4 w-4 text-status-error flex-shrink-0" />
            )}
            <span className="text-sm truncate flex-1">{section.sectionName}</span>
            <span className={cn(
              "text-xs",
              status === "over" ? "text-status-error" : "text-text-tertiary"
            )}>
              {wordCount}{section.wordLimit && `/${section.wordLimit}`}
            </span>
            {section.isRequired && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                Req
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}
