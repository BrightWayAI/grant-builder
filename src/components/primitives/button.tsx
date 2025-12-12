import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button Component
 * 
 * Variants:
 * - primary: Brand gold, high emphasis actions
 * - secondary: White with border, medium emphasis
 * - ghost: Transparent, low emphasis
 * - destructive: Red, dangerous actions
 * - ai: Bronze accent, AI-related actions
 * - link: Text-only, inline links
 * 
 * Sizes:
 * - sm: Compact buttons
 * - default: Standard size
 * - lg: Large, prominent buttons
 * - icon: Square icon-only buttons
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "whitespace-nowrap rounded-md font-medium",
    "transition-all duration-normal ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.98]",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-brand text-white",
          "hover:bg-brand-hover hover:-translate-y-px hover:shadow-md",
          "active:bg-brand-active",
        ],
        secondary: [
          "bg-surface-card text-text-primary border border-border",
          "hover:bg-gray-100 hover:border-border-strong",
          "active:bg-gray-200",
        ],
        ghost: [
          "text-text-secondary",
          "hover:bg-gray-100 hover:text-text-primary",
          "active:bg-gray-200",
        ],
        destructive: [
          "bg-status-error text-white",
          "hover:bg-status-error/90 hover:-translate-y-px hover:shadow-md",
        ],
        ai: [
          "bg-ai-light text-ai border border-ai/20",
          "hover:bg-ai/10 hover:border-ai/30",
          "active:bg-ai/15",
        ],
        link: [
          "text-brand underline-offset-4",
          "hover:underline hover:text-brand-hover",
        ],
        // Shadcn compatibility aliases
        default: [
          "bg-brand text-white",
          "hover:bg-brand-hover hover:-translate-y-px hover:shadow-md",
          "active:bg-brand-active",
        ],
        outline: [
          "bg-surface-card text-text-primary border border-border",
          "hover:bg-gray-100 hover:border-border-strong",
          "active:bg-gray-200",
        ],
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
