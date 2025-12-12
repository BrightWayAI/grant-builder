import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/primitives/label";

/**
 * FormField Component
 * 
 * Combines label, input slot, helper text, and error message
 * into a consistent form field layout.
 */

interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  htmlFor?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, label, htmlFor, helperText, error, required, children, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-2", className)} {...props}>
      {label && (
        <Label htmlFor={htmlFor} variant={error ? "error" : "default"}>
          {label}
          {required && <span className="text-status-error ml-0.5">*</span>}
        </Label>
      )}
      {children}
      {(helperText || error) && (
        <p
          className={cn(
            "text-xs",
            error ? "text-status-error" : "text-text-tertiary"
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  )
);
FormField.displayName = "FormField";

export { FormField };
