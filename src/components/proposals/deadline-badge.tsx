"use client";

import { Badge } from "@/components/primitives/badge";
import { Calendar, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeadlineBadgeProps {
  deadline: Date | string | null;
  showIcon?: boolean;
  className?: string;
}

function getDaysUntil(deadline: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  return Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getDeadlineConfig(daysUntil: number): {
  variant: "default" | "success" | "warning" | "error";
  urgency: "overdue" | "urgent" | "soon" | "normal";
  label: string;
} {
  if (daysUntil < 0) {
    return { 
      variant: "error", 
      urgency: "overdue",
      label: `${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? "s" : ""} overdue`
    };
  }
  if (daysUntil === 0) {
    return { variant: "error", urgency: "urgent", label: "Due today" };
  }
  if (daysUntil === 1) {
    return { variant: "error", urgency: "urgent", label: "Due tomorrow" };
  }
  if (daysUntil <= 7) {
    return { 
      variant: "error", 
      urgency: "urgent", 
      label: `${daysUntil} days left` 
    };
  }
  if (daysUntil <= 14) {
    return { 
      variant: "warning", 
      urgency: "soon", 
      label: `${daysUntil} days left` 
    };
  }
  if (daysUntil <= 30) {
    return { 
      variant: "default", 
      urgency: "normal", 
      label: `${daysUntil} days left` 
    };
  }
  
  const weeks = Math.floor(daysUntil / 7);
  return { 
    variant: "default", 
    urgency: "normal", 
    label: `${weeks} week${weeks !== 1 ? "s" : ""} left` 
  };
}

export function DeadlineBadge({ deadline, showIcon = true, className }: DeadlineBadgeProps) {
  if (!deadline) return null;

  const deadlineDate = new Date(deadline);
  const daysUntil = getDaysUntil(deadlineDate);
  const config = getDeadlineConfig(daysUntil);

  const Icon = config.urgency === "overdue" 
    ? AlertTriangle 
    : config.urgency === "urgent" 
      ? Clock 
      : Calendar;

  return (
    <Badge 
      variant={config.variant} 
      className={cn("gap-1", className)}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}

export function DeadlineText({ deadline, className }: { deadline: Date | string | null; className?: string }) {
  if (!deadline) return null;

  const deadlineDate = new Date(deadline);
  const daysUntil = getDaysUntil(deadlineDate);
  const config = getDeadlineConfig(daysUntil);

  const formattedDate = deadlineDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: deadlineDate.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });

  return (
    <span className={cn(
      "text-sm",
      config.urgency === "overdue" && "text-status-error font-medium",
      config.urgency === "urgent" && "text-status-error",
      config.urgency === "soon" && "text-status-warning",
      config.urgency === "normal" && "text-text-secondary",
      className
    )}>
      Due {formattedDate} ({config.label})
    </span>
  );
}
