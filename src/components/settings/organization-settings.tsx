"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { Textarea } from "@/components/primitives/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/primitives/select";
import { useToast } from "@/components/ui/use-toast";

const BUDGET_RANGES = [
  { value: "under_500k", label: "Under $500,000" },
  { value: "500k_1m", label: "$500,000 - $1 million" },
  { value: "1m_2m", label: "$1 million - $2 million" },
  { value: "2m_5m", label: "$2 million - $5 million" },
  { value: "over_5m", label: "Over $5 million" },
];

interface Organization {
  id: string;
  name: string;
  ein: string | null;
  mission: string | null;
  geography: string | null;
  budgetRange: string | null;
  populationsServed: string | null;
}

export function OrganizationSettings({ organization }: { organization: Organization }) {
  const [formData, setFormData] = useState({
    name: organization.name,
    ein: organization.ein || "",
    mission: organization.mission || "",
    geography: organization.geography || "",
    budgetRange: organization.budgetRange || "",
    populationsServed: organization.populationsServed || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to update organization");
      }

      toast({
        title: "Settings saved",
        description: "Your organization settings have been updated",
      });

      router.refresh();
    } catch {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Organization Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ein">EIN</Label>
        <Input
          id="ein"
          value={formData.ein}
          onChange={(e) => setFormData({ ...formData, ein: e.target.value })}
          placeholder="XX-XXXXXXX"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mission">Mission Statement</Label>
        <Textarea
          id="mission"
          value={formData.mission}
          onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="geography">Geographic Focus</Label>
        <Input
          id="geography"
          value={formData.geography}
          onChange={(e) => setFormData({ ...formData, geography: e.target.value })}
          placeholder="e.g., San Francisco Bay Area, National"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="budgetRange">Annual Operating Budget</Label>
        <Select
          value={formData.budgetRange}
          onValueChange={(value) => setFormData({ ...formData, budgetRange: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select budget range" />
          </SelectTrigger>
          <SelectContent>
            {BUDGET_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="populations">Populations Served</Label>
        <Textarea
          id="populations"
          value={formData.populationsServed}
          onChange={(e) => setFormData({ ...formData, populationsServed: e.target.value })}
          rows={2}
        />
      </div>

      <Button type="submit" loading={isSaving}>
        {isSaving ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
