"use client";

/**
 * Paragraph Grounding Badge Component (AC-4.1)
 * 
 * Displays inline visual indicator for paragraph grounding status:
 * - GROUNDED: Green checkmark, sourced from KB
 * - PARTIAL: Yellow warning, partially sourced
 * - UNGROUNDED: Red warning, no source found
 * - PLACEHOLDER: Blue info, explicitly marked for user input
 */

import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type GroundingStatus = "GROUNDED" | "PARTIAL" | "UNGROUNDED" | "PLACEHOLDER" | "UNKNOWN";

interface SupportingChunk {
  documentName: string;
  similarity: number;
  excerpt?: string;
}

interface ParagraphBadgeProps {
  status: GroundingStatus;
  similarity?: number;
  supportingChunks?: SupportingChunk[];
  className?: string;
}

const STATUS_CONFIG = {
  GROUNDED: {
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    label: "Sourced",
    description: "This content is grounded in your knowledge base",
  },
  PARTIAL: {
    icon: AlertTriangle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    label: "Partial",
    description: "Some content may not be directly sourced",
  },
  UNGROUNDED: {
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    label: "Unverified",
    description: "No supporting source found - verify accuracy",
  },
  PLACEHOLDER: {
    icon: HelpCircle,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    label: "Needs Input",
    description: "This section requires your input",
  },
  UNKNOWN: {
    icon: HelpCircle,
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    label: "Unknown",
    description: "Grounding status not yet computed",
  },
};

export function ParagraphBadge({
  status,
  similarity,
  supportingChunks,
  className,
}: ParagraphBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  
  // Build tooltip text
  let tooltipText = config.description;
  if (supportingChunks && supportingChunks.length > 0) {
    const sources = supportingChunks.slice(0, 3).map(c => 
      `${c.documentName} (${Math.round(c.similarity * 100)}%)`
    ).join(', ');
    tooltipText += ` | Sources: ${sources}`;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border cursor-help",
        config.bgColor,
        config.borderColor,
        config.color,
        className
      )}
      title={tooltipText}
    >
      <Icon className="h-3 w-3" />
      <span className="hidden sm:inline">{config.label}</span>
      {similarity !== undefined && (
        <span className="opacity-70">
          {Math.round(similarity * 100)}%
        </span>
      )}
    </span>
  );
}

/**
 * Inline badge for use within text content
 */
export function InlineParagraphIndicator({
  status,
}: {
  status: GroundingStatus;
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-4 h-4 rounded-full ml-1",
        config.bgColor,
        config.color
      )}
      title={config.description}
    >
      <Icon className="h-2.5 w-2.5" />
    </span>
  );
}
