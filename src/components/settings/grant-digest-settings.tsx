"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/primitives/label";
import { useToast } from "@/components/ui/use-toast";
import { Mail, Loader2 } from "lucide-react";

export function GrantDigestSettings() {
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch("/api/grants/digest");
      if (response.ok) {
        const data = await response.json();
        setEnabled(data.enabled);
      }
    } catch (error) {
      console.error("Error fetching digest preferences:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async () => {
    setIsSaving(true);
    const newValue = !enabled;

    try {
      const response = await fetch("/api/grants/digest", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newValue }),
      });

      if (!response.ok) throw new Error("Failed to update preferences");

      setEnabled(newValue);
      toast({
        title: newValue ? "Digest enabled" : "Digest disabled",
        description: newValue
          ? "You'll receive weekly grant opportunity emails"
          : "You won't receive grant digest emails",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-start gap-3">
        <Mail className="h-5 w-5 text-text-tertiary mt-0.5" />
        <div>
          <Label className="text-sm font-medium">Weekly Grant Digest</Label>
          <p className="text-sm text-text-secondary">
            Receive weekly emails with new grant opportunities matching your profile
          </p>
        </div>
      </div>
      <button
        onClick={handleToggle}
        disabled={isSaving}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? "bg-brand" : "bg-gray-200"
        } ${isSaving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
