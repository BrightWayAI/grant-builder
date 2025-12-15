"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/primitives/dialog";
import { Button } from "@/components/primitives/button";
import { Progress } from "@/components/primitives/progress";
import { Sparkles, FolderOpen, Compass, FileText, Rocket } from "lucide-react";

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
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4">
            <div className={`inline-flex p-4 rounded-full ${currentStep.iconBg}`}>
              <Icon className={`h-8 w-8 ${currentStep.iconColor}`} />
            </div>
          </div>
          <DialogTitle className="text-xl">{currentStep.title}</DialogTitle>
          <DialogDescription className="text-base">
            {currentStep.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Progress value={progress} className="h-1" />
          <p className="text-center text-xs text-text-tertiary mt-2">
            {step + 1} of {steps.length}
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
