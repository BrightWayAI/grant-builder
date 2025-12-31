"use client";

/**
 * Enforcement Warning Component (AC-4.2)
 * 
 * Non-deletable warning banners that persist in the UI.
 * Unlike text-based warnings, these cannot be removed by the user.
 * 
 * Used to warn about:
 * - Unverified claims in content
 * - Content generated without KB sources
 * - Enforcement failures
 * - Policy overrides blocked
 */

import {
  AlertTriangle,
  AlertCircle,
  Info,
  ShieldAlert,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type WarningLevel = "info" | "warning" | "error" | "critical";

interface EnforcementWarningProps {
  level: WarningLevel;
  title: string;
  message: string;
  details?: string[];
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const LEVEL_CONFIG = {
  info: {
    icon: Info,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-800",
    iconColor: "text-blue-600",
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    textColor: "text-yellow-800",
    iconColor: "text-yellow-600",
  },
  error: {
    icon: AlertCircle,
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-800",
    iconColor: "text-red-600",
  },
  critical: {
    icon: ShieldAlert,
    bgColor: "bg-red-100",
    borderColor: "border-red-300",
    textColor: "text-red-900",
    iconColor: "text-red-700",
  },
};

export function EnforcementWarning({
  level,
  title,
  message,
  details,
  dismissible = false,
  onDismiss,
  className,
}: EnforcementWarningProps) {
  const config = LEVEL_CONFIG[level];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        config.bgColor,
        config.borderColor,
        className
      )}
      role="alert"
      data-enforcement-warning="true"
      data-level={level}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", config.iconColor)} />
        <div className="flex-1 min-w-0">
          <h4 className={cn("font-medium text-sm", config.textColor)}>
            {title}
          </h4>
          <p className={cn("text-sm mt-1", config.textColor, "opacity-90")}>
            {message}
          </p>
          {details && details.length > 0 && (
            <ul className={cn("text-xs mt-2 space-y-0.5", config.textColor, "opacity-80")}>
              {details.map((detail, idx) => (
                <li key={idx} className="flex items-start gap-1">
                  <span className="mt-1">•</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className={cn(
              "p-1 rounded hover:bg-black/10 transition-colors",
              config.textColor
            )}
            aria-label="Dismiss warning"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Sticky warning bar that stays at top of editor
 */
export function EnforcementWarningBar({
  warnings,
}: {
  warnings: Array<{
    id: string;
    level: WarningLevel;
    title: string;
    message: string;
  }>;
}) {
  if (warnings.length === 0) return null;

  // Show most severe warning prominently
  const sortedWarnings = [...warnings].sort((a, b) => {
    const levelOrder = { critical: 0, error: 1, warning: 2, info: 3 };
    return levelOrder[a.level] - levelOrder[b.level];
  });

  const primary = sortedWarnings[0];
  const config = LEVEL_CONFIG[primary.level];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "sticky top-0 z-10 border-b px-4 py-2",
        config.bgColor,
        config.borderColor
      )}
      data-enforcement-warning-bar="true"
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", config.iconColor)} />
        <span className={cn("text-sm font-medium", config.textColor)}>
          {primary.title}
        </span>
        <span className={cn("text-sm", config.textColor, "opacity-80")}>
          {primary.message}
        </span>
        {warnings.length > 1 && (
          <span className={cn("text-xs px-1.5 py-0.5 rounded", config.bgColor, config.textColor)}>
            +{warnings.length - 1} more
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Compact inline warning for use in content
 */
export function InlineEnforcementWarning({
  level,
  message,
}: {
  level: WarningLevel;
  message: string;
}) {
  const config = LEVEL_CONFIG[level];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs",
        config.bgColor,
        config.textColor
      )}
      data-inline-warning="true"
    >
      <Icon className="h-3 w-3" />
      {message}
    </span>
  );
}
