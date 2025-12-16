"use client";

import { cn } from "@/lib/utils";

export type BillingInterval = "monthly" | "yearly";

interface BillingToggleProps {
  value: BillingInterval;
  onChange: (value: BillingInterval) => void;
  className?: string;
}

export function BillingToggle({ value, onChange, className }: BillingToggleProps) {
  return (
    <div className={cn("inline-flex items-center gap-1 p-1 bg-surface-secondary rounded-full", className)}>
      <button
        onClick={() => onChange("monthly")}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-full transition-all",
          value === "monthly"
            ? "bg-white text-text-primary shadow-sm"
            : "text-text-secondary hover:text-text-primary"
        )}
      >
        Monthly
      </button>
      <button
        onClick={() => onChange("yearly")}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-full transition-all flex items-center gap-2",
          value === "yearly"
            ? "bg-white text-text-primary shadow-sm"
            : "text-text-secondary hover:text-text-primary"
        )}
      >
        Yearly
        <span className={cn(
          "px-1.5 py-0.5 text-xs font-semibold rounded-full",
          value === "yearly"
            ? "bg-green-100 text-green-700"
            : "bg-green-100 text-green-700"
        )}>
          Save 20%
        </span>
      </button>
    </div>
  );
}

export const PRICING = {
  individual: {
    monthly: { price: 49, label: "$49", sublabel: "/mo" },
    yearly: { price: 468, label: "$39", sublabel: "/mo", billed: "Billed annually ($468)" },
  },
  teams: {
    monthly: { price: 29, label: "$29", sublabel: "/seat/mo" },
    yearly: { price: 276, label: "$23", sublabel: "/seat/mo", billed: "Billed annually ($276/seat)" },
  },
  enterprise: {
    monthly: { price: 199, label: "$199", sublabel: "/mo" },
    yearly: { price: 1908, label: "$159", sublabel: "/mo", billed: "Billed annually ($1,908)" },
  },
} as const;
