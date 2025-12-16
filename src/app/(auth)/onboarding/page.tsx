"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";
import { useToast } from "@/components/ui/use-toast";
import { PageContainer } from "@/components/layouts/page-container";
import { Check } from "lucide-react";

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

export default function OnboardingPage() {
  const [formData, setFormData] = useState({
    name: "",
    orgType: "",
    programAreas: [] as string[],
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { update } = useSession();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Required field",
        description: "Please enter your organization name",
        variant: "destructive",
      });
      return;
    }

    if (!formData.orgType) {
      toast({
        title: "Required field",
        description: "Please select your organization type",
        variant: "destructive",
      });
      return;
    }

    if (formData.programAreas.length === 0) {
      toast({
        title: "Required field",
        description: "Please select at least one focus area",
        variant: "destructive",
      });
      return;
    }

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
        title: "Welcome to Beacon!",
        description: "Let's find you some grants.",
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
          <h1 className="text-title">Welcome to Beacon</h1>
          <p className="text-text-secondary mt-2">
            Quick setup to start finding grants (under 1 minute)
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tell us about your organization</CardTitle>
            <CardDescription>
              We&apos;ll use this to match you with relevant grants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your organization name"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>Organization Type</Label>
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
                <Label>Focus Areas</Label>
                <p className="text-sm text-text-secondary">
                  Select all that apply
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
              </div>

              <Button type="submit" loading={isLoading} className="w-full">
                {isLoading ? "Creating..." : "Get Started"}
              </Button>

              <p className="text-xs text-text-tertiary text-center">
                You can add more details in Settings anytime
              </p>
            </form>
          </CardContent>
        </Card>
      </PageContainer>
    </div>
  );
}
