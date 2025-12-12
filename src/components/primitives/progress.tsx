import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Progress Component
 * 
 * Built on Radix UI Progress primitive.
 * 
 * Variants:
 * - default: Brand gold fill
 * - success: Green fill
 * - warning: Amber fill (80%+ of limit)
 * - error: Red fill (at/over limit)
 * - ai: Animated shimmer for AI generation
 */
const progressVariants = cva(
  "h-1 w-full overflow-hidden rounded-full bg-gray-200",
  {
    variants: {
      size: {
        sm: "h-1",
        default: "h-1.5",
        lg: "h-2",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

const progressIndicatorVariants = cva(
  "h-full transition-all duration-slow ease-out rounded-full",
  {
    variants: {
      variant: {
        default: "bg-brand",
        success: "bg-status-success",
        warning: "bg-status-warning",
        error: "bg-status-error",
        ai: [
          "bg-gradient-to-r from-gray-200 via-ai-light to-gray-200",
          "bg-[length:200%_100%] animate-shimmer",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants>,
    VariantProps<typeof progressIndicatorVariants> {
  indicatorClassName?: string;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, variant, size, indicatorClassName, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(progressVariants({ size }), className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(progressIndicatorVariants({ variant }), indicatorClassName)}
      style={{ width: variant === "ai" ? "100%" : `${value || 0}%` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
