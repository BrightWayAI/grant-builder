import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Textarea Component
 * 
 * Multi-line text input with warm styling consistent with the design system.
 */
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // Base styles
          "flex min-h-[120px] w-full rounded-md px-4 py-3",
          "bg-surface-card border border-border",
          "font-body text-base text-text-primary leading-relaxed",
          "placeholder:text-text-placeholder",
          // Resize
          "resize-y",
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
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
