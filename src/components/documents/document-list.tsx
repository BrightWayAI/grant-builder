"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/primitives/button";
import { Badge } from "@/components/primitives/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { FileText, Trash2, RefreshCw, Layers, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { formatDate, formatFileSize } from "@/lib/utils";
import { DocumentStatus, DocumentType } from "@prisma/client";

interface Document {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  documentType: DocumentType;
  status: DocumentStatus;
  programArea: string | null;
  errorMessage: string | null;
  chunkCount?: number;
  createdAt: Date;
}

const TYPE_LABELS: Record<DocumentType, string> = {
  PROPOSAL: "Past Proposal",
  ANNUAL_REPORT: "Annual Report",
  PROGRAM_DESCRIPTION: "Program Description",
  LOGIC_MODEL: "Logic Model",
  IMPACT_REPORT: "Impact Report",
  EVALUATION_REPORT: "Evaluation Report",
  ORG_OVERVIEW: "Org Overview",
  BOILERPLATE: "Boilerplate",
  STAFF_BIOS: "Staff Bios",
  BOARD_BIOS: "Board Bios",
  FORM_990: "Form 990",
  AUDITED_FINANCIALS: "Financials",
  OTHER: "Other",
};

const TYPE_DESCRIPTIONS: Partial<Record<DocumentType, string>> = {
  PROPOSAL: "Past proposals help generate similar content",
  ANNUAL_REPORT: "Used for org history and impact data",
  PROGRAM_DESCRIPTION: "Describes programs and services",
  BOILERPLATE: "Reusable text blocks for proposals",
  ORG_OVERVIEW: "Mission, vision, and org info",
};

export function DocumentList({ documents: initialDocs }: { documents: Document[] }) {
  const [documents, setDocuments] = useState(initialDocs);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Poll for processing documents
  useEffect(() => {
    const processingDocs = documents.filter((d) => d.status === "PROCESSING");
    if (processingDocs.length === 0) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/documents");
        if (response.ok) {
          const updatedDocs = await response.json();
          setDocuments(updatedDocs);
          
          // Check if any previously processing docs are now done
          const stillProcessing = updatedDocs.filter(
            (d: Document) => d.status === "PROCESSING"
          );
          if (stillProcessing.length === 0) {
            clearInterval(interval);
          }
        }
      } catch (error) {
        console.error("Error polling documents:", error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [documents]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete document");
      }

      setDocuments((prev) => prev.filter((d) => d.id !== id));

      toast({
        title: "Document deleted",
        description: "Removed from your knowledge base",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleReindex = async (id: string) => {
    setReindexingId(id);
    try {
      const response = await fetch(`/api/documents/${id}/reindex`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to reindex document");
      }

      // Update status locally
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === id ? { ...d, status: "PROCESSING" as DocumentStatus, errorMessage: null } : d
        )
      );

      toast({
        title: "Reindexing started",
        description: "The document is being re-processed",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to reindex document",
        variant: "destructive",
      });
    } finally {
      setReindexingId(null);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <FileText className="h-12 w-12 mx-auto mb-4 text-text-disabled" />
        <h3 className="font-medium text-text-primary mb-1">No documents yet</h3>
        <p className="text-sm text-text-tertiary mb-4">
          Upload documents to build your knowledge base
        </p>
        <div className="text-xs text-text-tertiary max-w-md mx-auto">
          <p className="mb-2">Recommended documents:</p>
          <ul className="list-disc list-inside text-left space-y-1">
            <li>Past successful proposals</li>
            <li>Annual reports and impact data</li>
            <li>Program descriptions</li>
            <li>Organization overview / boilerplate</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="p-4 rounded-lg border border-border hover:border-text-tertiary transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-surface-secondary">
              <FileText className="h-5 w-5 text-text-tertiary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-text-primary truncate">
                  {doc.filename}
                </span>
                <Badge variant="outline" className="text-xs">
                  {TYPE_LABELS[doc.documentType]}
                </Badge>
              </div>
              
              <div className="flex items-center gap-3 text-xs text-text-secondary">
                <span>{formatFileSize(doc.fileSize)}</span>
                <span>•</span>
                <span>{formatDate(doc.createdAt)}</span>
                {doc.chunkCount !== undefined && doc.chunkCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      {doc.chunkCount} chunks
                    </span>
                  </>
                )}
              </div>

              {doc.status === "FAILED" && doc.errorMessage && (
                <div className="mt-2 text-xs text-status-error flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {doc.errorMessage}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Status indicator */}
              {doc.status === "INDEXED" && (
                <div className="flex items-center gap-1 text-status-success text-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Ready</span>
                </div>
              )}
              {doc.status === "PROCESSING" && (
                <div className="flex items-center gap-1 text-brand text-xs">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing</span>
                </div>
              )}
              {doc.status === "FAILED" && (
                <div className="flex items-center gap-1 text-status-error text-xs">
                  <AlertCircle className="h-4 w-4" />
                  <span>Failed</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-1 ml-2">
                {(doc.status === "FAILED" || doc.status === "INDEXED") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleReindex(doc.id)}
                    disabled={reindexingId === doc.id}
                    title="Re-process document"
                  >
                    <RefreshCw className={`h-4 w-4 ${reindexingId === doc.id ? "animate-spin" : ""}`} />
                  </Button>
                )}
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={deletingId === doc.id}
                    >
                      <Trash2 className="h-4 w-4 text-text-tertiary hover:text-status-error" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete document?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove &quot;{doc.filename}&quot; from your
                        knowledge base. Generated proposals that used this document
                        will not be affected.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(doc.id)}
                        className="bg-status-error hover:bg-status-error/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
