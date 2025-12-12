"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Upload, File, X, CheckCircle, AlertCircle } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";

const DOCUMENT_TYPES = [
  { value: "PROPOSAL", label: "Past Proposal" },
  { value: "ANNUAL_REPORT", label: "Annual Report" },
  { value: "PROGRAM_DESCRIPTION", label: "Program Description" },
  { value: "LOGIC_MODEL", label: "Logic Model" },
  { value: "IMPACT_REPORT", label: "Impact Report" },
  { value: "EVALUATION_REPORT", label: "Evaluation Report" },
  { value: "ORG_OVERVIEW", label: "Organization Overview" },
  { value: "BOILERPLATE", label: "Boilerplate Text" },
  { value: "STAFF_BIOS", label: "Staff Bios" },
  { value: "BOARD_BIOS", label: "Board Bios" },
  { value: "FORM_990", label: "Form 990" },
  { value: "AUDITED_FINANCIALS", label: "Audited Financials" },
  { value: "OTHER", label: "Other" },
];

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
};

interface FileWithMeta {
  file: File;
  documentType: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

export function DocumentUpload({ organizationId }: { organizationId: string }) {
  const [files, setFiles] = useState<FileWithMeta[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      documentType: "PROPOSAL",
      status: "pending" as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFileType = (index: number, documentType: string) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, documentType } : f))
    );
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

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
      router.refresh();
    }
  };

  const pendingFiles = files.filter((f) => f.status === "pending");

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 text-gray-400 mx-auto mb-4" />
        {isDragActive ? (
          <p className="text-primary">Drop files here...</p>
        ) : (
          <>
            <p className="text-gray-600 mb-1">
              Drag and drop files here, or click to select
            </p>
            <p className="text-sm text-gray-400">PDF, DOCX, or TXT up to 50MB</p>
          </>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((fileWithMeta, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-3 border rounded-lg bg-gray-50"
            >
              <File className="h-8 w-8 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{fileWithMeta.file.name}</span>
                  <span className="text-sm text-gray-500">
                    ({formatFileSize(fileWithMeta.file.size)})
                  </span>
                </div>
                {fileWithMeta.status === "uploading" && (
                  <Progress value={fileWithMeta.progress} className="h-1 mt-2" />
                )}
                {fileWithMeta.status === "error" && (
                  <p className="text-sm text-red-600 mt-1">{fileWithMeta.error}</p>
                )}
              </div>
              {fileWithMeta.status === "pending" && (
                <Select
                  value={fileWithMeta.documentType}
                  onValueChange={(value) => updateFileType(index, value)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {fileWithMeta.status === "success" && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {fileWithMeta.status === "error" && (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              {fileWithMeta.status === "pending" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          {pendingFiles.length > 0 && (
            <div className="flex justify-end">
              <Button onClick={uploadFiles} disabled={isUploading}>
                {isUploading ? "Uploading..." : `Upload ${pendingFiles.length} file(s)`}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
