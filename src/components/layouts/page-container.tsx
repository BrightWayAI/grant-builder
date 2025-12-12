import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * PageContainer Component
 * 
 * Consistent page wrapper with max-width and padding.
 * 
 * Variants:
 * - narrow: 720px - for forms, editors, single-column content
 * - default: 1200px - standard content pages
 * - wide: 1400px - dashboards, tables, dense layouts
 * - full: 100% - no max-width constraint
 */
const pageContainerVariants = cva(
  "mx-auto w-full px-6 md:px-8",
  {
    variants: {
      size: {
        narrow: "max-w-narrow",
        default: "max-w-content",
        wide: "max-w-wide",
        full: "max-w-none",
      },
      padding: {
        none: "py-0",
        sm: "py-6",
        default: "py-8",
        lg: "py-12",
      },
    },
    defaultVariants: {
      size: "default",
      padding: "default",
    },
  }
);

export interface PageContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pageContainerVariants> {}

const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, size, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(pageContainerVariants({ size, padding }), className)}
      {...props}
    />
  )
);
PageContainer.displayName = "PageContainer";

export { PageContainer, pageContainerVariants };
