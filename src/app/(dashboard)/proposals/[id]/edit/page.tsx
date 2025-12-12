"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { ProposalEditor } from "@/components/editor/proposal-editor";
import { CopilotPanel } from "@/components/editor/copilot-panel";
import { ExportDialog } from "@/components/proposals/export-dialog";
import {
  ArrowLeft,
  Save,
  Download,
  Sparkles,
  Loader2,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { formatDate, countWords } from "@/lib/utils";
import Link from "next/link";

interface Section {
  id: string;
  sectionName: string;
  description: string | null;
  content: string;
  generatedContent: string | null;
  wordLimit: number | null;
  charLimit: number | null;
  isRequired: boolean;
  order: number;
}

interface Proposal {
  id: string;
  title: string;
  funderName: string | null;
  programTitle: string | null;
  deadline: string | null;
  fundingAmountMin: number | null;
  fundingAmountMax: number | null;
  status: string;
  sections: Section[];
}

export default function ProposalEditPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingSection, setGeneratingSection] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showCopilot, setShowCopilot] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const shouldGenerate = searchParams.get("generate") === "true";

  useEffect(() => {
    fetchProposal();
  }, [params.id]);

  useEffect(() => {
    if (proposal && shouldGenerate && proposal.sections.length > 0) {
      generateAllSections();
      router.replace(`/proposals/${params.id}/edit`);
    }
  }, [proposal?.id, shouldGenerate]);

  const fetchProposal = async () => {
    try {
      const response = await fetch(`/api/proposals/${params.id}`);
      if (!response.ok) throw new Error("Failed to fetch proposal");
      const data = await response.json();
      setProposal(data);
      if (data.sections.length > 0 && !activeSection) {
        setActiveSection(data.sections[0].id);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load proposal",
        variant: "destructive",
      });
    }
  };

  const saveSection = useCallback(
    async (sectionId: string, content: string) => {
      setIsSaving(true);
      try {
        await fetch(`/api/proposals/${params.id}/sections/${sectionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        setLastSaved(new Date());
        setProposal((prev) =>
          prev
            ? {
                ...prev,
                sections: prev.sections.map((s) =>
                  s.id === sectionId ? { ...s, content } : s
                ),
              }
            : null
        );
      } catch {
        toast({
          title: "Error",
          description: "Failed to save changes",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [params.id, toast]
  );

  const generateSection = async (sectionId: string) => {
    setGeneratingSection(sectionId);
    setIsGenerating(true);

    try {
      const response = await fetch(`/api/proposals/${params.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId }),
      });

      if (!response.ok) throw new Error("Generation failed");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        setProposal((prev) =>
          prev
            ? {
                ...prev,
                sections: prev.sections.map((s) =>
                  s.id === sectionId ? { ...s, content } : s
                ),
              }
            : null
        );
      }

      await saveSection(sectionId, content);
    } catch {
      toast({
        title: "Error",
        description: "Failed to generate content",
        variant: "destructive",
      });
    } finally {
      setGeneratingSection(null);
      setIsGenerating(false);
    }
  };

  const generateAllSections = async () => {
    if (!proposal) return;

    for (const section of proposal.sections) {
      if (!section.content || section.content.trim() === "") {
        await generateSection(section.id);
      }
    }
  };

  const handleCopilotResult = (text: string) => {
    if (!activeSection || !proposal) return;

    const section = proposal.sections.find((s) => s.id === activeSection);
    if (!section) return;

    const newContent = section.content.replace(selectedText, text);
    setProposal((prev) =>
      prev
        ? {
            ...prev,
            sections: prev.sections.map((s) =>
              s.id === activeSection ? { ...s, content: newContent } : s
            ),
          }
        : null
    );
    saveSection(activeSection, newContent);
    setSelectedText("");
  };

  if (!proposal) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentSection = proposal.sections.find((s) => s.id === activeSection);
  const wordCount = currentSection ? countWords(currentSection.content) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/proposals">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{proposal.title}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              {proposal.funderName && <span>{proposal.funderName}</span>}
              {proposal.deadline && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Due {formatDate(proposal.deadline)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Saved {formatDate(lastSaved)}
            </span>
          )}
          {isSaving && (
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          )}
          <Button
            variant="outline"
            onClick={() => setShowCopilot(!showCopilot)}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            AI Copilot
          </Button>
          <Button variant="outline" onClick={() => setShowExport(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Sections</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1 p-2">
              {proposal.sections.map((section) => {
                const sectionWordCount = countWords(section.content);
                const isOverLimit =
                  section.wordLimit && sectionWordCount > section.wordLimit;
                const isActive = section.id === activeSection;

                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">
                        {section.sectionName}
                      </span>
                      {generatingSection === section.id && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs ${
                          isActive
                            ? "text-primary-foreground/70"
                            : isOverLimit
                            ? "text-red-500"
                            : "text-gray-500"
                        }`}
                      >
                        {sectionWordCount}
                        {section.wordLimit && ` / ${section.wordLimit}`} words
                      </span>
                      {section.isRequired && (
                        <Badge
                          variant={isActive ? "secondary" : "outline"}
                          className="text-xs py-0"
                        >
                          Required
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {currentSection && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>{currentSection.sectionName}</CardTitle>
                  {currentSection.description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {currentSection.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm ${
                      currentSection.wordLimit && wordCount > currentSection.wordLimit
                        ? "text-red-500 font-medium"
                        : "text-gray-500"
                    }`}
                  >
                    {wordCount}
                    {currentSection.wordLimit && ` / ${currentSection.wordLimit}`} words
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateSection(currentSection.id)}
                    disabled={isGenerating}
                  >
                    {generatingSection === currentSection.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-1" />
                        {currentSection.content ? "Regenerate" : "Generate"}
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ProposalEditor
                  content={currentSection.content}
                  onChange={(content) => {
                    setProposal((prev) =>
                      prev
                        ? {
                            ...prev,
                            sections: prev.sections.map((s) =>
                              s.id === currentSection.id ? { ...s, content } : s
                            ),
                          }
                        : null
                    );
                  }}
                  onSave={(content) => saveSection(currentSection.id, content)}
                  onSelectionChange={setSelectedText}
                  placeholder={`Write your ${currentSection.sectionName.toLowerCase()} here...`}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {showCopilot && (
          <CopilotPanel
            selectedText={selectedText}
            proposalId={proposal.id}
            onResult={handleCopilotResult}
            onClose={() => setShowCopilot(false)}
          />
        )}
      </div>

      <ExportDialog
        open={showExport}
        onOpenChange={setShowExport}
        proposal={proposal}
      />
    </div>
  );
}
