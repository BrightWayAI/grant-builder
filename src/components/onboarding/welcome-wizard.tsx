"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/primitives/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface WelcomeWizardProps {
  open: boolean;
  onComplete: () => void;
}

type TourStep = {
  target: string | null;
  title: string;
  description: string;
  position: "center" | "right";
};

const steps: TourStep[] = [
  {
    target: null,
    title: "Welcome to Beacon",
    description: "Thanks for signing up! Let's show you around.",
    position: "center",
  },
  {
    target: "[data-tour='knowledge-base']",
    title: "Knowledge Base",
    description: "Upload your past proposals, reports, and org docs to teach the AI your voice.",
    position: "right",
  },
  {
    target: "[data-tour='discover']",
    title: "Discover Grants",
    description: "We search thousands of grants daily and match them to your profile.",
    position: "right",
  },
  {
    target: "[data-tour='proposals']",
    title: "Proposals",
    description: "Start a new proposal and let the AI draft sections using your knowledge base.",
    position: "right",
  },
  {
    target: "[data-tour='knowledge-base']",
    title: "Get Started",
    description: "Ready to dive in? Let's set up your knowledge base.",
    position: "right",
  },
];

export function WelcomeWizard({ open, onComplete }: WelcomeWizardProps) {
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});
  const router = useRouter();

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;
  const isFirstStep = step === 0;

  const positionTooltip = useCallback(() => {
    if (!currentStep.target) {
      setTooltipStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
      setArrowStyle({ display: "none" });
      return;
    }

    const target = document.querySelector(currentStep.target);
    if (!target) {
      setTooltipStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
      setArrowStyle({ display: "none" });
      return;
    }

    const rect = target.getBoundingClientRect();
    const tooltipWidth = 300;
    const gap = 12;

    if (currentStep.position === "right") {
      setTooltipStyle({
        position: "fixed",
        top: rect.top + rect.height / 2,
        left: rect.right + gap,
        transform: "translateY(-50%)",
      });
      setArrowStyle({
        position: "absolute",
        left: -6,
        top: "50%",
        transform: "translateY(-50%) rotate(45deg)",
        width: 12,
        height: 12,
        background: "inherit",
        borderLeft: "1px solid",
        borderBottom: "1px solid",
        borderColor: "inherit",
      });
    }
  }, [currentStep]);

  useEffect(() => {
    if (open) {
      positionTooltip();
      window.addEventListener("resize", positionTooltip);
      return () => window.removeEventListener("resize", positionTooltip);
    }
  }, [open, step, positionTooltip]);

  useEffect(() => {
    if (!open || !currentStep.target) return;
    
    const target = document.querySelector(currentStep.target);
    if (target) {
      target.classList.add("tour-highlight");
      return () => target.classList.remove("tour-highlight");
    }
  }, [open, step, currentStep.target]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setStep(step + 1);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/user/welcome", { method: "POST" });
      onComplete();
    } catch (error) {
      console.error("Failed to mark welcome as seen:", error);
      onComplete();
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/user/welcome", { method: "POST" });
      onComplete();
      router.push("/knowledge-base");
    } catch (error) {
      console.error("Failed to mark welcome as seen:", error);
      onComplete();
      router.push("/knowledge-base");
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Subtle overlay */}
      <div className="fixed inset-0 z-40 bg-gray-950/20 pointer-events-none" />
      
      {/* Tooltip */}
      <div
        style={tooltipStyle}
        className={cn(
          "z-50 w-[300px] bg-surface-card rounded-lg border border-border shadow-xl p-4",
          "animate-in fade-in-0 zoom-in-95 duration-200"
        )}
      >
        {/* Arrow */}
        <div style={arrowStyle} className="bg-surface-card border-border" />
        
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100 text-text-tertiary"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="pr-6">
          <h3 className="font-semibold text-text-primary">{currentStep.title}</h3>
          <p className="text-sm text-text-secondary mt-1">{currentStep.description}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <span className="text-xs text-text-tertiary">
            {step + 1} of {steps.length}
          </span>
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
            )}
            <Button 
              size="sm"
              onClick={handleNext}
              loading={isLoading}
            >
              {isLastStep ? "Get Started" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
