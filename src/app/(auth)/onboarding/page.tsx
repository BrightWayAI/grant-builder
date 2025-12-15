"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { Textarea } from "@/components/primitives/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/primitives/select";
import { Progress } from "@/components/primitives/progress";
import { useToast } from "@/components/ui/use-toast";
import { PageContainer } from "@/components/layouts/page-container";
import { Check } from "lucide-react";
import { GeographicFocusSelector } from "@/components/settings/geographic-focus-selector";
import { GeographicFocus } from "@/lib/geography";

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

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    ein: "",
    mission: "",
    orgType: "",
    geographicFocus: { countries: [], states: [], regions: [] } as GeographicFocus,
    budgetRange: "",
    populationsServed: "",
    programAreas: [] as string[],
    fundingMin: "",
    fundingMax: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { update } = useSession();
  const { toast } = useToast();

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step === 1 && !formData.name) {
      toast({
        title: "Required field",
        description: "Please enter your organization name",
        variant: "destructive",
      });
      return;
    }
    if (step === 2 && !formData.orgType) {
      toast({
        title: "Required field",
        description: "Please select your organization type",
        variant: "destructive",
      });
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (formData.programAreas.length === 0) {
      toast({
        title: "Required field",
        description: "Please select at least one program area",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          geographicFocus: formData.geographicFocus,
          fundingMin: formData.fundingMin ? parseInt(formData.fundingMin) : null,
          fundingMax: formData.fundingMax ? parseInt(formData.fundingMax) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create organization");
      }

      await update({ organizationId: data.id });

      toast({
        title: "Organization created",
        description: "Welcome to Beacon! Let's find you some grants.",
      });

      router.push("/dashboard");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create organization",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
    <div className="min-h-screen bg-surface-page py-12 px-4">
      <PageContainer size="narrow" padding="none">
        <div className="text-center mb-8">
          <h1 className="text-title">Set up your organization</h1>
          <p className="text-text-secondary mt-2">
            Tell us about your nonprofit so we can match you with relevant grants
          </p>
        </div>

        <Progress value={progress} className="mb-8" />

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && "Basic Information"}
              {step === 2 && "Organization Type"}
              {step === 3 && "Programs & Focus Areas"}
              {step === 4 && "Funding Preferences"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Let's start with the essentials"}
              {step === 2 && "Help us understand your eligibility"}
              {step === 3 && "What areas does your organization focus on?"}
              {step === 4 && "What kind of grants are you looking for?"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Community Action Network"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ein">EIN (Optional)</Label>
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
                    placeholder="Our mission is to..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Geographic Focus</Label>
                  <GeographicFocusSelector
                    value={formData.geographicFocus}
                    onChange={(value) => setFormData({ ...formData, geographicFocus: value })}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgType">Organization Type *</Label>
                  <p className="text-sm text-text-secondary mb-2">
                    This determines which grants you&apos;re eligible for
                  </p>
                  <div className="grid gap-2">
                    {ORG_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, orgType: type.value })}
                        className={`flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                          formData.orgType === type.value
                            ? "border-brand bg-brand-light"
                            : "border-border hover:border-text-tertiary"
                        }`}
                      >
                        <span className="font-medium">{type.label}</span>
                        {formData.orgType === type.value && (
                          <Check className="h-4 w-4 text-brand" />
                        )}
                      </button>
                    ))}
                  </div>
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
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-text-secondary">
                  Select all that apply. This helps us match you with relevant grants. *
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PROGRAM_AREAS.map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleProgramArea(area)}
                      className={`flex items-center justify-between p-3 rounded-lg border text-left text-sm transition-colors ${
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
                <div className="space-y-2 pt-4">
                  <Label htmlFor="populations">Populations Served</Label>
                  <Textarea
                    id="populations"
                    value={formData.populationsServed}
                    onChange={(e) =>
                      setFormData({ ...formData, populationsServed: e.target.value })
                    }
                    placeholder="e.g., Low-income families, youth ages 14-24, seniors, immigrants"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-text-secondary">
                  Help us find grants that match your capacity and goals.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fundingMin">Minimum Grant Size</Label>
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
                  <div className="space-y-2">
                    <Label htmlFor="fundingMax">Maximum Grant Size</Label>
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
                <div className="bg-surface-subtle rounded-lg p-4 mt-4">
                  <h4 className="font-medium text-sm mb-2">What happens next?</h4>
                  <ul className="text-sm text-text-secondary space-y-1">
                    <li>• We&apos;ll search for grants matching your profile</li>
                    <li>• New opportunities will appear on your dashboard</li>
                    <li>• You can enable weekly email digests in settings</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-8">
              {step > 1 ? (
                <Button variant="secondary" onClick={handleBack}>
                  Back
                </Button>
              ) : (
                <div />
              )}
              {step < totalSteps ? (
                <Button onClick={handleNext}>Continue</Button>
              ) : (
                <Button onClick={handleSubmit} loading={isLoading}>
                  {isLoading ? "Creating..." : "Complete Setup"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-text-tertiary mt-4">
          Step {step} of {totalSteps}
        </p>
      </PageContainer>
    </div>
  );
}
