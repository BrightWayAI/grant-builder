"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { FileText, Download, Copy, Loader2, CheckCircle } from "lucide-react";

interface Section {
  id: string;
  sectionName: string;
  content: string;
}

interface Proposal {
  id: string;
  title: string;
  funderName: string | null;
  sections: Section[];
}

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: Proposal;
}

export function ExportDialog({ open, onOpenChange, proposal }: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const { toast } = useToast();

  const exportToDocx = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: proposal.id }),
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${proposal.title.replace(/[^a-z0-9]/gi, "_")}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export complete",
        description: "Your proposal has been downloaded as a DOCX file",
      });
    } catch {
      toast({
        title: "Export failed",
        description: "Failed to export proposal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const copySection = async (section: Section) => {
    try {
      const plainText = section.content.replace(/<[^>]*>/g, "");
      await navigator.clipboard.writeText(plainText);
      setCopiedSection(section.id);
      setTimeout(() => setCopiedSection(null), 2000);
      toast({
        title: "Copied",
        description: `${section.sectionName} copied to clipboard`,
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const copyAll = async () => {
    try {
      const text = proposal.sections
        .map((s) => {
          const plainText = s.content.replace(/<[^>]*>/g, "");
          return `## ${s.sectionName}\n\n${plainText}`;
        })
        .join("\n\n---\n\n");
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Full proposal copied to clipboard",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Export Proposal</DialogTitle>
          <DialogDescription>
            Download your proposal or copy sections to clipboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={exportToDocx}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <FileText className="h-8 w-8" />
              )}
              <span>Download as DOCX</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={copyAll}
            >
              <Copy className="h-8 w-8" />
              <span>Copy All to Clipboard</span>
            </Button>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Copy Individual Sections</h4>
            <div className="space-y-2 max-h-64 overflow-auto">
              {proposal.sections.map((section) => (
                <div
                  key={section.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                >
                  <div>
                    <span className="font-medium">{section.sectionName}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {section.content.replace(/<[^>]*>/g, "").split(/\s+/).length} words
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copySection(section)}
                  >
                    {copiedSection === section.id ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
