"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/primitives/button";
import { Progress } from "@/components/primitives/progress";
import { Sparkles, FolderOpen, Compass, FileText, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

interface WelcomeWizardProps {
  open: boolean;
  onComplete: () => void;
}

const steps = [
  {
    icon: Sparkles,
    title: "Welcome to Beacon",
    description: "Thanks for signing up! Let's show you around.",
    iconBg: "bg-brand-light",
    iconColor: "text-brand",
  },
  {
    icon: FolderOpen,
    title: "Knowledge Base",
    description: "Upload your past proposals, reports, and org docs to teach the AI your voice.",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  {
    icon: Compass,
    title: "Discover Grants",
    description: "We search thousands of grants daily and match them to your profile.",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    icon: FileText,
    title: "Proposals",
    description: "Start a new proposal and let the AI draft sections using your knowledge base.",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
  },
  {
    icon: Rocket,
    title: "Get Started",
    description: "Ready to dive in? Let's set up your knowledge base.",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
];

export function WelcomeWizard({ open, onComplete }: WelcomeWizardProps) {
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

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

  const Icon = currentStep.icon;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={() => {}}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay 
          className={cn(
            "fixed inset-0 z-50 bg-gray-950/50 backdrop-blur-sm",
            "data-[state=open]:animate-fade-in"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-full max-w-md",
            "translate-x-[-50%] translate-y-[-50%]",
            "bg-surface-card rounded-lg border border-border shadow-xl",
            "p-6",
            "data-[state=open]:animate-scale-in",
            "focus:outline-none"
          )}
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="text-center">
            <div className="mx-auto mb-4">
              <div className={`inline-flex p-4 rounded-full ${currentStep.iconBg}`}>
                <Icon className={`h-8 w-8 ${currentStep.iconColor}`} />
              </div>
            </div>
            <DialogPrimitive.Title className="font-display text-xl font-semibold text-text-primary">
              {currentStep.title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-base text-text-secondary mt-2">
              {currentStep.description}
            </DialogPrimitive.Description>
          </div>

          <div className="py-6">
            <Progress value={progress} className="h-1" />
            <p className="text-center text-xs text-text-tertiary mt-2">
              {step + 1} of {steps.length}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleNext} 
              className="w-full" 
              loading={isLoading && isLastStep}
            >
              {isLastStep ? "Go to Knowledge Base" : "Next"}
            </Button>
            {!isLastStep && (
              <Button 
                variant="ghost" 
                onClick={handleSkip} 
                className="w-full text-text-secondary"
                loading={isLoading && !isLastStep}
              >
                Skip tour
              </Button>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
