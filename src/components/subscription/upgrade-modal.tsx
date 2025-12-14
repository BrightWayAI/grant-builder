"use client";

import { useState } from "react";
import { Button } from "@/components/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/primitives/dialog";
import { Check, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: "trial_ended" | "limit_reached" | "upgrade";
}

const plans = [
  {
    id: "individual",
    name: "Individual",
    price: 49,
    features: [
      "2 proposals per month",
      "250 MB knowledge base",
      "25 documents",
      "Grant discovery",
    ],
  },
  {
    id: "teams",
    name: "Teams",
    price: 29,
    priceLabel: "per seat",
    features: [
      "5 proposals per seat",
      "1 GB shared storage",
      "100 documents",
      "Unlimited members",
    ],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 199,
    features: [
      "50 proposals per month",
      "5 GB knowledge base",
      "500 documents",
      "Dedicated support",
    ],
  },
];

export function UpgradeModal({ open, onOpenChange, trigger }: UpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<"individual" | "teams" | "enterprise">("individual");
  const [seats, setSeats] = useState(3);
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          seats: selectedPlan === "teams" ? seats : 1,
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMessage = () => {
    switch (trigger) {
      case "trial_ended":
        return "You've used your 3 free proposals. Upgrade to keep writing winning grants.";
      case "limit_reached":
        return "You've reached your monthly proposal limit. Upgrade for more proposals.";
      default:
        return "Upgrade your plan to unlock more proposals and features.";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-brand" />
            Upgrade to Continue
          </DialogTitle>
          <DialogDescription>{getMessage()}</DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-4 mt-4">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id as "individual" | "teams" | "enterprise")}
              className={cn(
                "relative text-left p-5 rounded-xl border-2 transition-all",
                selectedPlan === plan.id
                  ? "border-brand bg-brand/5"
                  : "border-border hover:border-border-hover"
              )}
            >
              {plan.popular && (
                <span className="absolute -top-2.5 right-4 px-2 py-0.5 bg-brand text-white text-xs font-medium rounded-full">
                  Best Value
                </span>
              )}

              <div className="mb-3">
                <h3 className="font-semibold">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold">${plan.price}</span>
                  <span className="text-sm text-text-secondary">
                    /mo {plan.priceLabel || ""}
                  </span>
                </div>
              </div>

              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        {selectedPlan === "teams" && (
          <div className="flex items-center gap-4 p-4 bg-surface-subtle rounded-lg">
            <label className="text-sm font-medium">Team size:</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSeats(Math.max(3, seats - 1))}
                disabled={seats <= 3}
              >
                -
              </Button>
              <span className="w-12 text-center font-medium">{seats}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSeats(seats + 1)}
              >
                +
              </Button>
            </div>
            <span className="text-sm text-text-secondary ml-auto">
              ${seats * 29}/mo total
            </span>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button onClick={handleCheckout} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Continue to Checkout
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
