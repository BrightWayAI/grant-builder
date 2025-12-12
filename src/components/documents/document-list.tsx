"use client";

import { useState } from "react";
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
import { FileText, Trash2, RefreshCw } from "lucide-react";
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

export function DocumentList({ documents }: { documents: Document[] }) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete document");
      }

      toast({
        title: "Document deleted",
        description: "The document has been removed from your knowledge base",
      });

      router.refresh();
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
    try {
      const response = await fetch(`/api/documents/${id}/reindex`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to reindex document");
      }

      toast({
        title: "Reindexing started",
        description: "The document will be re-processed shortly",
      });

      router.refresh();
    } catch {
      toast({
        title: "Error",
        description: "Failed to reindex document",
        variant: "destructive",
      });
    }
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        <FileText className="h-12 w-12 mx-auto mb-4 text-text-disabled" />
        <p>No documents uploaded yet</p>
        <p className="text-sm text-text-tertiary">Upload documents above to get started</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {documents.map((doc) => (
        <div key={doc.id} className="py-4 flex items-center gap-4">
          <FileText className="h-8 w-8 text-text-tertiary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-text-primary truncate">{doc.filename}</span>
              <Badge variant="default" className="text-xs">
                {TYPE_LABELS[doc.documentType]}
              </Badge>
            </div>
            <div className="text-sm text-text-secondary">
              {formatFileSize(doc.fileSize)} • Uploaded {formatDate(doc.createdAt)}
            </div>
          </div>
          <Badge
            variant={
              doc.status === "INDEXED"
                ? "success"
                : doc.status === "FAILED"
                ? "error"
                : "default"
            }
          >
            {doc.status === "INDEXED" && "Indexed"}
            {doc.status === "PROCESSING" && "Processing..."}
            {doc.status === "FAILED" && "Failed"}
          </Badge>
          <div className="flex gap-1">
            {doc.status === "FAILED" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleReindex(doc.id)}
                title="Retry indexing"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={deletingId === doc.id}
                >
                  <Trash2 className="h-4 w-4 text-text-tertiary hover:text-status-error" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete document?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove &quot;{doc.filename}&quot; from your knowledge base.
                    This action cannot be undone.
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
      ))}
    </div>
  );
}
