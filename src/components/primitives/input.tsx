import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Input Component
 * 
 * Base text input with warm styling consistent with the design system.
 * Supports all native input attributes.
 */
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex h-10 w-full rounded-md px-4 py-2",
          "bg-surface-card border border-border",
          "font-body text-base text-text-primary",
          "placeholder:text-text-placeholder",
          // Transitions
          "transition-all duration-normal ease-out",
          // Hover
          "hover:border-border-strong",
          // Focus
          "focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/30",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100",
          // Error state
          error && "border-status-error focus:border-status-error focus:ring-status-error/30",
          // File input special styles
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
