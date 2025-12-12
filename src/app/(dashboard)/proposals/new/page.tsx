"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Label } from "@/components/primitives/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { useToast } from "@/components/ui/use-toast";
import { RFPUpload } from "@/components/proposals/rfp-upload";
import { RFPRequirements } from "@/components/proposals/rfp-requirements";
import { Loader2 } from "lucide-react";
import { ParsedRFP, RFPSection, getDefaultSections } from "@/lib/ai/rfp-parser";

type Step = "upload" | "requirements" | "generating";

export default function NewProposalPage() {
  const [step, setStep] = useState<Step>("upload");
  const [title, setTitle] = useState("");
  const [parsedRFP, setParsedRFP] = useState<ParsedRFP | null>(null);
  const [sections, setSections] = useState<RFPSection[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleRFPParsed = (parsed: ParsedRFP) => {
    setParsedRFP(parsed);
    setSections(parsed.sections);
    setTitle(parsed.programTitle || `${parsed.funderName} Proposal`);
    setStep("requirements");
  };

  const handleManualSetup = () => {
    setSections(getDefaultSections());
    setStep("requirements");
  };

  const handleCreateProposal = async () => {
    if (!title) {
      toast({
        title: "Title required",
        description: "Please enter a proposal title",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setStep("generating");

    try {
      const response = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          funderName: parsedRFP?.funderName,
          programTitle: parsedRFP?.programTitle,
          deadline: parsedRFP?.deadline,
          fundingAmountMin: parsedRFP?.fundingAmount?.min,
          fundingAmountMax: parsedRFP?.fundingAmount?.max,
          eligibility: parsedRFP?.eligibility || [],
          attachments: parsedRFP?.attachments || [],
          submissionInstructions: parsedRFP?.submissionInstructions,
          sections,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create proposal");
      }

      const proposal = await response.json();

      toast({
        title: "Proposal created",
        description: "Generating draft content...",
      });

      router.push(`/proposals/${proposal.id}/edit?generate=true`);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create proposal",
        variant: "destructive",
      });
      setStep("requirements");
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-title">Create New Proposal</h1>
        <p className="text-text-secondary">
          Upload an RFP to extract requirements, or start from a template
        </p>
      </div>

      {step === "upload" && (
        <Tabs defaultValue="upload" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upload">Upload RFP</TabsTrigger>
            <TabsTrigger value="manual">Start from Template</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Upload RFP Document</CardTitle>
                <CardDescription>
                  We&apos;ll extract the funder, deadline, sections, and requirements automatically
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RFPUpload onParsed={handleRFPParsed} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual">
            <Card>
              <CardHeader>
                <CardTitle>Start from Template</CardTitle>
                <CardDescription>
                  Begin with standard grant proposal sections and customize as needed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Proposal Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Community Health Initiative 2024"
                  />
                </div>
                <Button onClick={handleManualSetup}>Continue with Template</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {step === "requirements" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Proposal Details</CardTitle>
              <CardDescription>Review and edit the extracted information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Proposal Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter proposal title"
                  />
                </div>
                {parsedRFP?.funderName && (
                  <div className="space-y-2">
                    <Label>Funder</Label>
                    <Input value={parsedRFP.funderName} readOnly className="bg-gray-100" />
                  </div>
                )}
                {parsedRFP?.deadline && (
                  <div className="space-y-2">
                    <Label>Deadline</Label>
                    <Input value={parsedRFP.deadline} readOnly className="bg-gray-100" />
                  </div>
                )}
                {parsedRFP?.fundingAmount?.max && (
                  <div className="space-y-2">
                    <Label>Funding Amount</Label>
                    <Input
                      value={`Up to $${parsedRFP.fundingAmount.max.toLocaleString()}`}
                      readOnly
                      className="bg-gray-100"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <RFPRequirements sections={sections} onSectionsChange={setSections} />

          {parsedRFP?.eligibility && parsedRFP.eligibility.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Eligibility Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {parsedRFP.eligibility.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {parsedRFP?.attachments && parsedRFP.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Required Attachments</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {parsedRFP.attachments.map((att, i) => (
                    <li key={i}>{att}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep("upload")}>
              Back
            </Button>
            <Button onClick={handleCreateProposal} disabled={!title}>
              Create Proposal & Generate Draft
            </Button>
          </div>
        </div>
      )}

      {step === "generating" && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-brand mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Creating your proposal...</h3>
            <p className="text-text-secondary">
              Setting up sections and preparing to generate content
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
