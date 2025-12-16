"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/primitives/button";
import { Label } from "@/components/primitives/label";
import { Badge } from "@/components/primitives/badge";
import { Progress } from "@/components/primitives/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/primitives/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Upload, File, X, CheckCircle, AlertCircle } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { DOCUMENT_CATEGORIES, ALL_DOCUMENT_TYPES } from "@/lib/document-categories";
import { DocumentType } from "@prisma/client";

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
};

interface FileWithMeta {
  file: File;
  documentType: DocumentType;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

interface AddDocumentButtonProps {
  organizationId: string;
}

export function AddDocumentButton({ organizationId }: AddDocumentButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<DocumentType>("PROPOSAL");
  const [files, setFiles] = useState<FileWithMeta[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      documentType: selectedType,
      status: "pending" as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, [selectedType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 50 * 1024 * 1024,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== "pending") continue;

      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: "uploading", progress: 10 } : f
        )
      );

      try {
        const formData = new FormData();
        formData.append("file", files[i].file);
        formData.append("documentType", files[i].documentType);
        formData.append("organizationId", organizationId);

        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, progress: 50 } : f))
        );

        const response = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Upload failed");
        }

        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "success", progress: 100 } : f
          )
        );
      } catch (error) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: "error",
                  progress: 0,
                  error: error instanceof Error ? error.message : "Upload failed",
                }
              : f
          )
        );
      }
    }

    setIsUploading(false);

    const successCount = files.filter((f) => f.status === "success").length;
    if (successCount > 0) {
      toast({
        title: "Upload complete",
        description: `${successCount} file(s) uploaded and queued for indexing`,
      });
      
      setTimeout(() => {
        setOpen(false);
        setFiles([]);
        setSelectedType("PROPOSAL");
        router.refresh();
      }, 1000);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isUploading) return;
    setOpen(newOpen);
    if (!newOpen) {
      setFiles([]);
      setSelectedType("PROPOSAL");
    }
  };

  const pendingFiles = files.filter((f) => f.status === "pending");
  const selectedTypeInfo = ALL_DOCUMENT_TYPES.find((t) => t.type === selectedType);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Document
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Document</DialogTitle>
            <DialogDescription>
              Upload a document to your knowledge base
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Document Type</Label>
              <div className="flex flex-wrap gap-2">
                {DOCUMENT_CATEGORIES.map((category) => (
                  <div key={category.id} className="space-y-1">
                    {category.types.map((typeInfo) => (
                      <Badge
                        key={typeInfo.type}
                        variant={selectedType === typeInfo.type ? "default" : "outline"}
                        className="cursor-pointer mr-1"
                        onClick={() => setSelectedType(typeInfo.type)}
                      >
                        {typeInfo.label}
                      </Badge>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {selectedTypeInfo && (
              <div className="text-sm text-text-secondary bg-surface-subtle rounded-lg p-3">
                <p>{selectedTypeInfo.description}</p>
              </div>
            )}

            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                isDragActive
                  ? "border-brand bg-brand-light"
                  : "border-border hover:border-text-tertiary"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-8 w-8 text-text-tertiary mx-auto mb-3" />
              {isDragActive ? (
                <p className="text-brand">Drop files here...</p>
              ) : (
                <>
                  <p className="text-text-secondary text-sm mb-1">
                    Drag and drop files, or click to select
                  </p>
                  <p className="text-xs text-text-tertiary">PDF, DOCX, or TXT up to 50MB</p>
                </>
              )}
            </div>

            {files.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {files.map((fileWithMeta, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border",
                      fileWithMeta.status === "success" && "bg-status-success/5 border-status-success/20",
                      fileWithMeta.status === "error" && "bg-status-error/5 border-status-error/20",
                      fileWithMeta.status === "pending" && "border-border bg-surface-subtle",
                      fileWithMeta.status === "uploading" && "border-brand/20 bg-brand-light"
                    )}
                  >
                    <File className="h-5 w-5 text-text-tertiary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{fileWithMeta.file.name}</p>
                      <p className="text-xs text-text-tertiary">
                        {formatFileSize(fileWithMeta.file.size)}
                      </p>
                      {fileWithMeta.status === "uploading" && (
                        <Progress value={fileWithMeta.progress} className="h-1 mt-1" />
                      )}
                      {fileWithMeta.status === "error" && (
                        <p className="text-xs text-status-error mt-1">{fileWithMeta.error}</p>
                      )}
                    </div>
                    {fileWithMeta.status === "success" && (
                      <CheckCircle className="h-4 w-4 text-status-success" />
                    )}
                    {fileWithMeta.status === "error" && (
                      <AlertCircle className="h-4 w-4 text-status-error" />
                    )}
                    {fileWithMeta.status === "pending" && (
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <X className="h-4 w-4 text-text-tertiary" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {pendingFiles.length > 0 && (
              <div className="flex justify-end pt-2">
                <Button onClick={uploadFiles} loading={isUploading}>
                  {isUploading ? "Uploading..." : `Upload ${pendingFiles.length} file(s)`}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
