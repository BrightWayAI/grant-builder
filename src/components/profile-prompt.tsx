"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, MapPin, FileText, DollarSign } from "lucide-react";
import { Button } from "@/components/primitives/button";
import { useToast } from "@/components/ui/use-toast";

export type ProfilePromptType = "location" | "mission" | "funding";

interface ProfilePromptProps {
  type: ProfilePromptType;
  onDismiss: () => void;
}

const PROMPT_CONFIG = {
  location: {
    icon: MapPin,
    title: "Add your location",
    description: "See grants specific to your region",
    cta: "Add Location",
  },
  mission: {
    icon: FileText,
    title: "Add your mission",
    description: "Get better AI-powered grant recommendations",
    cta: "Add Mission",
  },
  funding: {
    icon: DollarSign,
    title: "Set funding preferences",
    description: "Filter grants by amount to match your capacity",
    cta: "Set Preferences",
  },
};

export function ProfilePrompt({ type, onDismiss }: ProfilePromptProps) {
  const router = useRouter();
  const config = PROMPT_CONFIG[type];
  const Icon = config.icon;

  const handleAction = () => {
    router.push("/settings");
  };

  return (
    <div className="bg-brand-light border border-brand/20 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-brand/10 rounded-lg">
          <Icon className="h-5 w-5 text-brand" />
        </div>
        <div>
          <p className="font-medium text-sm">{config.title}</p>
          <p className="text-sm text-text-secondary">{config.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleAction}>
          {config.cta}
        </Button>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-surface-subtle rounded"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-text-tertiary" />
        </button>
      </div>
    </div>
  );
}

interface ProfilePromptManagerProps {
  hasLocation: boolean;
  hasMission: boolean;
  hasFundingPrefs: boolean;
  savedGrantCount: number;
  accountAgeDays: number;
}

export function useProfilePrompts({
  hasLocation,
  hasMission,
  hasFundingPrefs,
  savedGrantCount,
  accountAgeDays,
}: ProfilePromptManagerProps): ProfilePromptType | null {
  // Show location prompt after saving first grant
  if (!hasLocation && savedGrantCount >= 1) {
    return "location";
  }

  // Show mission prompt after 7 days
  if (!hasMission && accountAgeDays >= 7) {
    return "mission";
  }

  // Show funding prefs after saving 3+ grants
  if (!hasFundingPrefs && savedGrantCount >= 3) {
    return "funding";
  }

  return null;
}

// Wrapper component that handles dismissal state
interface ProfilePromptContainerProps {
  promptType: ProfilePromptType;
  organizationId: string;
}

export function ProfilePromptContainer({ promptType, organizationId }: ProfilePromptContainerProps) {
  const [dismissed, setDismissed] = useState(false);
  const { toast } = useToast();

  const handleDismiss = async () => {
    setDismissed(true);
    // Optionally persist dismissal to avoid showing again
    try {
      await fetch(`/api/organizations/${organizationId}/dismiss-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptType }),
      });
    } catch {
      // Silently fail - UX already updated
    }
  };

  if (dismissed) return null;

  return <ProfilePrompt type={promptType} onDismiss={handleDismiss} />;
}
