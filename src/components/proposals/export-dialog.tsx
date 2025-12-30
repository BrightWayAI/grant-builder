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
import { 
  FileText, 
  Copy, 
  Loader2, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  AlertCircle
} from "lucide-react";
import type { ExportGateResult, ExportBlock, ExportWarning } from "@/types/enforcement";

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

type ExportStep = 'initial' | 'checking' | 'blocked' | 'warning' | 'ready' | 'exporting';

export function ExportDialog({ open, onOpenChange, proposal }: ExportDialogProps) {
  const [step, setStep] = useState<ExportStep>('initial');
  const [gateResult, setGateResult] = useState<ExportGateResult | null>(null);
  const [auditRecordId, setAuditRecordId] = useState<string | null>(null);
  const [attestationChecked, setAttestationChecked] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const { toast } = useToast();

  const resetState = () => {
    setStep('initial');
    setGateResult(null);
    setAuditRecordId(null);
    setAttestationChecked(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  };

  const checkExportGate = async () => {
    setStep('checking');
    try {
      const response = await fetch("/api/export/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: proposal.id, exportFormat: 'DOCX' }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check export gate');
      }

      setGateResult(data.gateResult);
      setAuditRecordId(data.auditRecordId);

      if (data.gateResult.decision === 'BLOCK') {
        setStep('blocked');
      } else if (data.gateResult.decision === 'WARN') {
        setStep('warning');
      } else {
        setStep('ready');
      }
    } catch (error) {
      console.error('Export gate check failed:', error);
      toast({
        title: "Check failed",
        description: "Could not verify proposal. Please try again.",
        variant: "destructive",
      });
      setStep('initial');
    }
  };

  const submitAttestation = async () => {
    if (!auditRecordId || !gateResult?.attestationText) return;

    try {
      const response = await fetch("/api/export/attestation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          auditRecordId, 
          attestationText: gateResult.attestationText 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record attestation');
      }

      setStep('ready');
    } catch (error) {
      console.error('Attestation failed:', error);
      toast({
        title: "Attestation failed",
        description: "Could not record attestation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const exportToDocx = async () => {
    setStep('exporting');
    try {
      const response = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          proposalId: proposal.id,
          skipGate: true, // Gate was already checked
          auditRecordId
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        
        // Handle gate result if returned
        if (data.gateResult) {
          setGateResult(data.gateResult);
          if (data.gateResult.decision === 'BLOCK') {
            setStep('blocked');
            return;
          }
        }
        
        throw new Error(data.error || "Export failed");
      }

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
      
      handleOpenChange(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export failed",
        description: "Failed to export proposal. Please try again.",
        variant: "destructive",
      });
      setStep('ready');
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'blocked' ? 'Export Blocked' : 
             step === 'warning' ? 'Review Warnings' : 
             'Export Proposal'}
          </DialogTitle>
          <DialogDescription>
            {step === 'blocked' ? 'Please resolve the following issues before exporting' :
             step === 'warning' ? 'Please review the following warnings before proceeding' :
             'Download your proposal or copy sections to clipboard'}
          </DialogDescription>
        </DialogHeader>

        {/* Blocked State */}
        {step === 'blocked' && gateResult && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700 font-medium mb-3">
                <XCircle className="h-5 w-5" />
                Export cannot proceed
              </div>
              <div className="space-y-3">
                {gateResult.blocks.map((block, i) => (
                  <BlockItem key={i} block={block} />
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Warning State */}
        {step === 'warning' && gateResult && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-700 font-medium mb-3">
                <AlertTriangle className="h-5 w-5" />
                Warnings detected
              </div>
              <div className="space-y-3">
                {gateResult.warnings.map((warning, i) => (
                  <WarningItem key={i} warning={warning} />
                ))}
              </div>
            </div>

            {gateResult.attestationRequired && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attestationChecked}
                    onChange={(e) => setAttestationChecked(e.target.checked)}
                    className="mt-1 rounded"
                  />
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">Attestation Required</div>
                    <div className="text-gray-600 mt-1">
                      {gateResult.attestationText}
                    </div>
                  </div>
                </label>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={gateResult.attestationRequired ? submitAttestation : () => setStep('ready')}
                disabled={gateResult.attestationRequired && !attestationChecked}
              >
                {gateResult.attestationRequired ? 'Confirm & Proceed' : 'Proceed Anyway'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Initial and Ready State */}
        {(step === 'initial' || step === 'ready' || step === 'checking' || step === 'exporting') && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                onClick={step === 'ready' ? exportToDocx : checkExportGate}
                disabled={step === 'checking' || step === 'exporting'}
              >
                {(step === 'checking' || step === 'exporting') ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <FileText className="h-8 w-8" />
                )}
                <span>
                  {step === 'checking' ? 'Checking...' : 
                   step === 'exporting' ? 'Exporting...' : 
                   'Download as DOCX'}
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                onClick={copyAll}
                disabled={step === 'checking' || step === 'exporting'}
              >
                <Copy className="h-8 w-8" />
                <span>Copy All to Clipboard</span>
              </Button>
            </div>

            {step === 'ready' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Proposal passed all checks. Ready to export.</span>
              </div>
            )}

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

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BlockItem({ block }: { block: ExportBlock }) {
  return (
    <div className="bg-white rounded-md p-3 border border-red-100">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-red-800">{block.reason}</div>
          {block.affectedItems.length > 0 && (
            <div className="text-xs text-red-600 mt-1">
              Affected: {block.affectedItems.slice(0, 3).join(', ')}
              {block.affectedItems.length > 3 && ` +${block.affectedItems.length - 3} more`}
            </div>
          )}
          <div className="text-xs text-gray-600 mt-2">
            <span className="font-medium">How to fix:</span> {block.resolution}
          </div>
        </div>
      </div>
    </div>
  );
}

function WarningItem({ warning }: { warning: ExportWarning }) {
  const severityColors = {
    LOW: 'text-yellow-600',
    MEDIUM: 'text-yellow-700',
    HIGH: 'text-orange-700'
  };

  return (
    <div className="bg-white rounded-md p-3 border border-yellow-100">
      <div className="flex items-start gap-2">
        <AlertTriangle className={`h-4 w-4 ${severityColors[warning.severity]} mt-0.5 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-yellow-800">{warning.message}</div>
          {warning.affectedItems.length > 0 && (
            <div className="text-xs text-yellow-600 mt-1">
              Affected: {warning.affectedItems.slice(0, 3).join(', ')}
              {warning.affectedItems.length > 3 && ` +${warning.affectedItems.length - 3} more`}
            </div>
          )}
        </div>
        <span className={`text-xs font-medium ${severityColors[warning.severity]} bg-yellow-100 px-2 py-0.5 rounded`}>
          {warning.severity}
        </span>
      </div>
    </div>
  );
}
