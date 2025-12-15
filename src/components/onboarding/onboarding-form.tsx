"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { Textarea } from "@/components/primitives/textarea";
import { GeographicFocusSelector } from "@/components/settings/geographic-focus-selector";
import { useToast } from "@/components/ui/use-toast";
import { GeographicFocus } from "@/lib/geography";

export function OnboardingForm() {
  const [name, setName] = useState("");
  const [mission, setMission] = useState("");
  const [geographicFocus, setGeographicFocus] = useState<GeographicFocus>({ countries: [], states: [], regions: [] });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Add your organization name", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mission, geographicFocus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create organization");
      }
      router.push("/dashboard");
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Unable to save organization",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="org-name">Organization name</Label>
        <Input
          id="org-name"
          placeholder="Your organization"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Geographic focus</Label>
        <GeographicFocusSelector value={geographicFocus} onChange={setGeographicFocus} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mission">Mission (optional)</Label>
        <Textarea
          id="mission"
          placeholder="What you do and who you serve"
          value={mission}
          onChange={(e) => setMission(e.target.value)}
          rows={3}
        />
      </div>

      <Button type="submit" loading={loading} className="w-full">
        {loading ? "Saving..." : "Save and continue"}
      </Button>
    </form>
  );
}
