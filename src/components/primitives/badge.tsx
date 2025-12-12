import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge Component
 * 
 * Variants:
 * - default: Neutral gray
 * - success: Green for positive status
 * - warning: Amber for caution
 * - error: Red for errors/destructive
 * - info: Blue for informational
 * - ai: Bronze for AI-related content
 * - brand: Gold for brand emphasis
 */
const badgeVariants = cva(
  [
    "inline-flex items-center gap-1",
    "rounded-sm px-2 py-0.5",
    "font-body text-xs font-medium",
    "transition-colors duration-fast",
  ],
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-text-secondary",
        success: "bg-status-success-light text-status-success",
        warning: "bg-status-warning-light text-status-warning",
        error: "bg-status-error-light text-status-error",
        info: "bg-status-info-light text-status-info",
        ai: "bg-surface-ai text-ai",
        brand: "bg-brand-light text-brand",
        outline: "border border-border text-text-secondary bg-transparent",
        // Shadcn compatibility
        secondary: "bg-gray-100 text-text-secondary",
        destructive: "bg-status-error-light text-status-error",
      },
      size: {
        default: "px-2 py-0.5 text-xs",
        sm: "px-1.5 py-0.5 text-[10px]",
        lg: "px-2.5 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
