"use client";

/**
 * Paragraph Attribution Component (AC-1.1, AC-4.1)
 * 
 * Displays paragraph-level source attribution in the editor:
 * - Visual badges showing GROUNDED/PARTIAL/UNGROUNDED/PLACEHOLDER status
 * - Hover to show supporting source chunks
 * - Click to see full evidence
 * 
 * This makes every paragraph traceable to source or clearly marked as unverified.
 */

import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ChevronDown,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ParagraphStatus = "GROUNDED" | "PARTIAL" | "UNGROUNDED" | "PLACEHOLDER" | "FAILED";

export interface SupportingChunk {
  content: string;
  similarity: number;
  documentId: string;
  filename: string;
}

export interface ParagraphAttribution {
  index: number;
  status: ParagraphStatus;
  bestSimilarity: number;
  supportingChunks: SupportingChunk[];
}

interface ParagraphBadgeProps {
  attribution: ParagraphAttribution;
  onClick?: () => void;
}

const STATUS_CONFIG = {
  GROUNDED: {
    icon: CheckCircle2,
    label: "Grounded",
    description: "This paragraph is supported by your knowledge base",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    borderColor: "border-green-200",
    iconColor: "text-green-600",
  },
  PARTIAL: {
    icon: AlertTriangle,
    label: "Partially Grounded",
    description: "Some content may not be fully supported by sources",
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-700",
    borderColor: "border-yellow-200",
    iconColor: "text-yellow-600",
  },
  UNGROUNDED: {
    icon: XCircle,
    label: "Ungrounded",
    description: "This content has no supporting sources in your knowledge base",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    borderColor: "border-red-200",
    iconColor: "text-red-600",
  },
  PLACEHOLDER: {
    icon: HelpCircle,
    label: "Placeholder",
    description: "This content needs to be filled in with verified information",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
    iconColor: "text-blue-600",
  },
  FAILED: {
    icon: XCircle,
    label: "Verification Failed",
    description: "Could not verify this content against sources",
    bgColor: "bg-gray-50",
    textColor: "text-gray-700",
    borderColor: "border-gray-200",
    iconColor: "text-gray-600",
  },
};

export function ParagraphBadge({ attribution, onClick }: ParagraphBadgeProps) {
  const config = STATUS_CONFIG[attribution.status];
  const Icon = config.icon;
  const hasEvidence = attribution.supportingChunks.length > 0;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => {
          if (hasEvidence) setExpanded(!expanded);
          onClick?.();
        }}
        title={config.description}
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border transition-colors",
          config.bgColor,
          config.textColor,
          config.borderColor,
          "hover:opacity-80"
        )}
      >
        <Icon className={cn("h-3 w-3", config.iconColor)} />
        <span className="hidden sm:inline">{config.label}</span>
        {hasEvidence && (
          <ChevronDown className={cn("h-3 w-3 opacity-50 transition-transform", expanded && "rotate-180")} />
        )}
      </button>
      
      {expanded && hasEvidence && (
        <div className="absolute left-0 top-full mt-1 w-80 bg-background border rounded-lg shadow-lg z-50">
          <div className="p-3 border-b">
            <div className="font-medium text-sm">{config.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {config.description}
            </div>
            <div className="text-xs mt-2">
              Best match: {Math.round(attribution.bestSimilarity * 100)}% similarity
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            <div className="p-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Supporting Sources
            </div>
            {attribution.supportingChunks.map((chunk, idx) => (
              <div key={idx} className="px-3 py-2 border-t hover:bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium truncate flex-1">
                    {chunk.filename}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(chunk.similarity * 100)}%
                  </span>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-3">
                  {chunk.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface AttributedContentProps {
  content: string;
  attributions: ParagraphAttribution[];
  onParagraphClick?: (index: number) => void;
}

/**
 * Renders content with paragraph-level attribution badges
 */
export function AttributedContent({
  content,
  attributions,
  onParagraphClick,
}: AttributedContentProps) {
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, index) => {
        const attribution = attributions.find(a => a.index === index);
        const isPlaceholder = paragraph.includes("[[PLACEHOLDER:");
        
        // Parse placeholder content
        let displayText = paragraph;
        let placeholderType = "";
        let placeholderDesc = "";
        
        if (isPlaceholder) {
          const match = paragraph.match(/\[\[PLACEHOLDER:([^:]+):([^:]+):[^\]]+\]\]/);
          if (match) {
            placeholderType = match[1];
            placeholderDesc = match[2];
          }
        }
        
        return (
          <div
            key={index}
            className={cn(
              "group relative",
              isPlaceholder && "bg-blue-50/50 border border-blue-200 rounded-lg p-3"
            )}
          >
            {/* Attribution Badge */}
            {attribution && (
              <div className="absolute -left-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <ParagraphBadge
                  attribution={attribution}
                  onClick={() => onParagraphClick?.(index)}
                />
              </div>
            )}
            
            {/* Inline Badge for non-grounded content */}
            {attribution && (attribution.status === "UNGROUNDED" || attribution.status === "PARTIAL") && (
              <div className="float-right ml-2 mb-1">
                <ParagraphBadge
                  attribution={attribution}
                  onClick={() => onParagraphClick?.(index)}
                />
              </div>
            )}
            
            {isPlaceholder ? (
              <div className="flex items-start gap-2">
                <HelpCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-blue-800 text-sm">
                    {placeholderType.replace(/_/g, " ")}
                  </div>
                  <div className="text-blue-700 text-sm mt-1">
                    {placeholderDesc}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {displayText}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Simple inline status indicator for compact views
 */
export function StatusIndicator({ status }: { status: ParagraphStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  
  return (
    <span className={cn("inline-flex items-center", config.iconColor)}>
      <Icon className="h-3 w-3" />
    </span>
  );
}

/**
 * Coverage summary for a section
 */
export function CoverageSummary({
  groundedCount,
  partialCount,
  ungroundedCount,
  totalParagraphs,
  coverageScore,
}: {
  groundedCount: number;
  partialCount: number;
  ungroundedCount: number;
  totalParagraphs: number;
  coverageScore: number;
}) {
  return (
    <div className="flex items-center gap-4 text-xs">
      <div className="flex items-center gap-1">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
          style={{ width: `${Math.min(100, Math.max(0, coverageScore))}px` }}
        />
        <span className="font-medium">{coverageScore}%</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="flex items-center gap-0.5">
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          {groundedCount}
        </span>
        <span className="flex items-center gap-0.5">
          <AlertTriangle className="h-3 w-3 text-yellow-600" />
          {partialCount}
        </span>
        <span className="flex items-center gap-0.5">
          <XCircle className="h-3 w-3 text-red-600" />
          {ungroundedCount}
        </span>
      </div>
    </div>
  );
}
