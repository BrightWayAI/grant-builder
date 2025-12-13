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
  Download,
  Sparkles,
  Loader2,
  Calendar,
  CheckCircle,
  FileText,
  Edit3,
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

// Convert HTML to clean readable text
function htmlToReadableText(html: string): string {
  if (!html) return "";
  
  // Create a temporary div to parse HTML
  const temp = document.createElement("div");
  temp.innerHTML = html;
  
  // Get text content with proper spacing
  let text = "";
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tag = el.tagName.toLowerCase();
      
      // Add spacing before block elements
      if (["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li", "br"].includes(tag)) {
        if (text && !text.endsWith("\n")) {
          text += "\n";
        }
      }
      
      // Process children
      node.childNodes.forEach(walk);
      
      // Add spacing after block elements
      if (["p", "div", "h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
        text += "\n";
      }
      if (tag === "li") {
        text += "\n";
      }
    }
  };
  
  walk(temp);
  
  // Clean up extra whitespace
  return text
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");

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
        
        // Convert plain text to simple HTML paragraphs for the editor
        const htmlContent = content
          .split("\n\n")
          .filter(p => p.trim())
          .map(p => `<p>${p.trim()}</p>`)
          .join("");
        
        setProposal((prev) =>
          prev
            ? {
                ...prev,
                sections: prev.sections.map((s) =>
                  s.id === sectionId ? { ...s, content: htmlContent } : s
                ),
              }
            : null
        );
      }

      // Final save with proper HTML formatting
      const finalHtml = content
        .split("\n\n")
        .filter(p => p.trim())
        .map(p => `<p>${p.trim()}</p>`)
        .join("");
      
      await saveSection(sectionId, finalHtml);
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

  const getTotalWordCount = () => {
    if (!proposal) return 0;
    return proposal.sections.reduce((sum, s) => sum + countWords(s.content), 0);
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
      {/* Header */}
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
              <span>{getTotalWordCount()} total words</span>
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

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "edit" | "preview")}>
        <TabsList>
          <TabsTrigger value="edit" className="flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            Edit Sections
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Full Proposal Preview
          </TabsTrigger>
        </TabsList>

        {/* Edit Mode */}
        <TabsContent value="edit" className="mt-4">
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
        </TabsContent>

        {/* Preview Mode - Full Proposal View */}
        <TabsContent value="preview" className="mt-4">
          <Card>
            <CardHeader className="border-b">
              <div className="text-center space-y-2">
                <CardTitle className="text-2xl">{proposal.title}</CardTitle>
                {proposal.funderName && (
                  <p className="text-gray-600">Submitted to: {proposal.funderName}</p>
                )}
                {proposal.programTitle && (
                  <p className="text-gray-600">{proposal.programTitle}</p>
                )}
                <p className="text-sm text-gray-500">
                  {getTotalWordCount()} words | {proposal.sections.length} sections
                </p>
              </div>
            </CardHeader>
            <CardContent className="py-8">
              <div className="max-w-3xl mx-auto space-y-8">
                {proposal.sections.map((section, index) => (
                  <div key={section.id} className="proposal-section">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">
                      {index + 1}. {section.sectionName}
                    </h2>
                    <div className="prose prose-gray max-w-none">
                      {section.content ? (
                        <div 
                          className="whitespace-pre-wrap text-gray-700 leading-relaxed"
                          dangerouslySetInnerHTML={{ 
                            __html: section.content
                              // Clean up any markdown-style formatting
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\*(.*?)\*/g, '<em>$1</em>')
                              .replace(/^#+\s+/gm, '')
                          }}
                        />
                      ) : (
                        <p className="text-gray-400 italic">
                          This section has not been written yet.
                        </p>
                      )}
                    </div>
                    {section.wordLimit && (
                      <p className="text-xs text-gray-400 mt-4">
                        {countWords(section.content)} / {section.wordLimit} words
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ExportDialog
        open={showExport}
        onOpenChange={setShowExport}
        proposal={proposal}
      />
    </div>
  );
}
