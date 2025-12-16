"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { Textarea } from "@/components/primitives/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/primitives/select";
import { useToast } from "@/components/ui/use-toast";
import { GeographicFocusSelector } from "./geographic-focus-selector";
import { GeographicFocus } from "@/lib/geography";
import { Check } from "lucide-react";

const BUDGET_RANGES = [
  { value: "under_500k", label: "Under $500,000" },
  { value: "500k_1m", label: "$500,000 - $1 million" },
  { value: "1m_2m", label: "$1 million - $2 million" },
  { value: "2m_5m", label: "$2 million - $5 million" },
  { value: "over_5m", label: "Over $5 million" },
];

const ORG_TYPES = [
  { value: "501c3", label: "501(c)(3) Nonprofit" },
  { value: "nonprofit", label: "Other Nonprofit" },
  { value: "government", label: "Government Agency" },
  { value: "tribal", label: "Tribal Organization" },
  { value: "education", label: "Educational Institution" },
  { value: "small_business", label: "Small Business" },
];

const PROGRAM_AREAS = [
  "Education",
  "Health & Human Services",
  "Arts & Culture",
  "Environment",
  "Community Development",
  "Youth Development",
  "Housing",
  "Workforce Development",
  "Food Security",
  "Mental Health",
  "Disability Services",
  "Senior Services",
];

const FUNDING_RANGES = [
  { value: "10000", label: "$10,000" },
  { value: "25000", label: "$25,000" },
  { value: "50000", label: "$50,000" },
  { value: "100000", label: "$100,000" },
  { value: "250000", label: "$250,000" },
  { value: "500000", label: "$500,000" },
  { value: "1000000", label: "$1 million" },
  { value: "5000000", label: "$5 million+" },
];

interface Organization {
  id: string;
  name: string;
  ein: string | null;
  mission: string | null;
  geography: string | null;
  geographicFocus: GeographicFocus | null;
  budgetRange: string | null;
  populationsServed: string | null;
  orgType: string | null;
  programAreas: string[];
  fundingMin: number | null;
  fundingMax: number | null;
}

export function OrganizationSettings({ organization }: { organization: Organization }) {
  const [formData, setFormData] = useState({
    name: organization.name,
    ein: organization.ein || "",
    mission: organization.mission || "",
    geographicFocus: organization.geographicFocus || { countries: [], states: [], regions: [] },
    budgetRange: organization.budgetRange || "",
    populationsServed: organization.populationsServed || "",
    orgType: organization.orgType || "",
    programAreas: organization.programAreas || [],
    fundingMin: organization.fundingMin?.toString() || "",
    fundingMax: organization.fundingMax?.toString() || "",
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
        body: JSON.stringify({
          ...formData,
          fundingMin: formData.fundingMin ? parseInt(formData.fundingMin) : null,
          fundingMax: formData.fundingMax ? parseInt(formData.fundingMax) : null,
        }),
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

  const toggleProgramArea = (area: string) => {
    setFormData((prev) => ({
      ...prev,
      programAreas: prev.programAreas.includes(area)
        ? prev.programAreas.filter((a) => a !== area)
        : [...prev.programAreas, area],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        <Label>Organization Type</Label>
        <Select
          value={formData.orgType}
          onValueChange={(value) => setFormData({ ...formData, orgType: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select organization type" />
          </SelectTrigger>
          <SelectContent>
            {ORG_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ein">EIN</Label>
        <Input
          id="ein"
          value={formData.ein}
          onChange={(e) => setFormData({ ...formData, ein: e.target.value })}
          placeholder="XX-XXXXXXX"
        />
        <p className="text-xs text-text-tertiary">
          Your Employer Identification Number helps verify nonprofit status
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mission">Mission Statement</Label>
        <Textarea
          id="mission"
          value={formData.mission}
          onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
          rows={4}
          placeholder="Describe your organization's mission..."
        />
      </div>

      <div className="space-y-2">
        <Label>Focus Areas</Label>
        <p className="text-sm text-text-secondary">
          Select all areas your organization works in
        </p>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {PROGRAM_AREAS.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => toggleProgramArea(area)}
              className={`flex items-center justify-between p-2 rounded-lg border text-left text-sm transition-colors ${
                formData.programAreas.includes(area)
                  ? "border-brand bg-brand-light"
                  : "border-border hover:border-text-tertiary"
              }`}
            >
              <span>{area}</span>
              {formData.programAreas.includes(area) && (
                <Check className="h-4 w-4 text-brand flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Geographic Focus</Label>
        <GeographicFocusSelector
          value={formData.geographicFocus}
          onChange={(value) => setFormData({ ...formData, geographicFocus: value })}
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
        <Label>Grant Size Preferences</Label>
        <p className="text-sm text-text-secondary">
          Help us find grants that match your capacity
        </p>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div>
            <Label htmlFor="fundingMin" className="text-sm font-normal">Minimum</Label>
            <Select
              value={formData.fundingMin}
              onValueChange={(value) => setFormData({ ...formData, fundingMin: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="No minimum" />
              </SelectTrigger>
              <SelectContent>
                {FUNDING_RANGES.slice(0, -1).map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="fundingMax" className="text-sm font-normal">Maximum</Label>
            <Select
              value={formData.fundingMax}
              onValueChange={(value) => setFormData({ ...formData, fundingMax: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="No maximum" />
              </SelectTrigger>
              <SelectContent>
                {FUNDING_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="populations">Populations Served</Label>
        <Textarea
          id="populations"
          value={formData.populationsServed}
          onChange={(e) => setFormData({ ...formData, populationsServed: e.target.value })}
          rows={2}
          placeholder="e.g., Low-income families, youth ages 14-24, seniors"
        />
      </div>

      <Button type="submit" loading={isSaving}>
        {isSaving ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
