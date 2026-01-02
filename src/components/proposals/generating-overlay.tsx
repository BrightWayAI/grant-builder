"use client";

import { Card, CardContent } from "@/components/primitives/card";
import { Progress } from "@/components/primitives/progress";
import { Loader2, CheckCircle2, FileText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  sectionName: string;
}

interface GeneratingOverlayProps {
  sections: Section[];
  currentSectionId: string | null;
  completedSectionIds: string[];
  proposalTitle: string;
}

export function GeneratingOverlay({
  sections,
  currentSectionId,
  completedSectionIds,
  proposalTitle,
}: GeneratingOverlayProps) {
  const totalSections = sections.length;
  const completedCount = completedSectionIds.length;
  const progressPercent = totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
      <div className="max-w-lg w-full mx-4">
        <Card>
          <CardContent className="pt-8 pb-6 px-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand/10 mb-4">
                <Sparkles className="h-8 w-8 text-brand animate-pulse" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Generating Your Proposal</h2>
              <p className="text-text-secondary text-sm">{proposalTitle}</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Progress</span>
                <span className="font-medium">{completedCount} of {totalSections} sections</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sections.map((section) => {
                const isCompleted = completedSectionIds.includes(section.id);
                const isCurrent = section.id === currentSectionId;

                return (
                  <div
                    key={section.id}
                    className={cn(
                      "flex items-center gap-3 py-2 px-3 rounded-md transition-colors",
                      isCurrent && "bg-brand/5",
                      isCompleted && "text-text-secondary"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-status-success flex-shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="h-4 w-4 text-brand animate-spin flex-shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-text-disabled flex-shrink-0" />
                    )}
                    <span className={cn(
                      "text-sm truncate",
                      isCurrent && "text-text-primary font-medium"
                    )}>
                      {section.sectionName}
                    </span>
                    {isCurrent && (
                      <span className="text-xs text-brand ml-auto">Generating...</span>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-text-tertiary text-center mt-6">
              This may take a minute. We&apos;re grounding each section in your knowledge base.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
