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

const BUDGET_RANGES = [
  { value: "under_500k", label: "Under $500,000" },
  { value: "500k_1m", label: "$500,000 - $1 million" },
  { value: "1m_2m", label: "$1 million - $2 million" },
  { value: "2m_5m", label: "$2 million - $5 million" },
  { value: "over_5m", label: "Over $5 million" },
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
  "Other",
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    ein: "",
    mission: "",
    geography: "",
    budgetRange: "",
    populationsServed: "",
    programAreas: [] as string[],
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { update } = useSession();
  const { toast } = useToast();

  const totalSteps = 3;
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
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create organization");
      }

      await update({ organizationId: data.id });

      toast({
        title: "Organization created",
        description: "Let's set up your knowledge base!",
      });

      router.push("/knowledge-base");
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
            Tell us about your nonprofit so we can personalize your experience
          </p>
        </div>

        <Progress value={progress} className="mb-8" />

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && "Basic Information"}
              {step === 2 && "Organization Details"}
              {step === 3 && "Programs & Focus Areas"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Let's start with the essentials"}
              {step === 2 && "Help us understand your organization better"}
              {step === 3 && "What areas does your organization focus on?"}
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
                    Your Employer Identification Number helps us verify nonprofit status
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
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="geography">Geographic Focus</Label>
                  <Input
                    id="geography"
                    value={formData.geography}
                    onChange={(e) => setFormData({ ...formData, geography: e.target.value })}
                    placeholder="e.g., San Francisco Bay Area, Texas, National"
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
                    onChange={(e) =>
                      setFormData({ ...formData, populationsServed: e.target.value })
                    }
                    placeholder="e.g., Low-income families, youth ages 14-24, seniors"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-text-secondary">
                  Select all that apply. This helps us match you with relevant grants.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PROGRAM_AREAS.map((area) => (
                    <Button
                      key={area}
                      type="button"
                      variant={formData.programAreas.includes(area) ? "primary" : "secondary"}
                      className="justify-start h-auto py-2 px-3"
                      onClick={() => toggleProgramArea(area)}
                    >
                      {area}
                    </Button>
                  ))}
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
