import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Label Component
 * 
 * Form label with consistent typography.
 * Built on Radix UI Label primitive.
 */
const labelVariants = cva(
  [
    "font-body text-sm font-medium leading-normal",
    "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  ],
  {
    variants: {
      variant: {
        default: "text-text-primary",
        muted: "text-text-secondary",
        error: "text-status-error",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
    VariantProps<typeof labelVariants> {}

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, variant, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants({ variant }), className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
