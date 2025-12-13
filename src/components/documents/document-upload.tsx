"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/primitives/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/primitives/select";
import { Progress } from "@/components/primitives/progress";
import { Badge } from "@/components/primitives/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
  Upload, 
  File, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Info,
  FileText,
  Building2,
  Target,
  TrendingUp,
  DollarSign,
  Folder,
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { DOCUMENT_CATEGORIES, ALL_DOCUMENT_TYPES, DocumentTypeInfo } from "@/lib/document-categories";

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
};

// Icon mapping
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  FileText,
  Building2,
  Target,
  TrendingUp,
  DollarSign,
  Folder,
};

interface FileWithMeta {
  file: File;
  documentType: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

interface DocumentUploadProps {
  organizationId: string;
  suggestedType?: string;
}

export function DocumentUpload({ organizationId, suggestedType }: DocumentUploadProps) {
  const [files, setFiles] = useState<FileWithMeta[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      documentType: suggestedType || "PROPOSAL",
      status: "pending" as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, [suggestedType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 50 * 1024 * 1024,
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
      // Clear successful uploads after a delay
      setTimeout(() => {
        setFiles((prev) => prev.filter((f) => f.status !== "success"));
        router.refresh();
      }, 2000);
    }
  };

  const pendingFiles = files.filter((f) => f.status === "pending");
  const selectedTypeInfo = selectedCategory 
    ? ALL_DOCUMENT_TYPES.find((t) => t.type === selectedCategory)
    : null;

  return (
    <div className="space-y-6">
      {/* Category Selection Guide */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <Info className="h-4 w-4 text-brand" />
          What type of document are you uploading?
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {DOCUMENT_CATEGORIES.map((category) => {
            const IconComponent = CATEGORY_ICONS[category.icon] || Folder;
            const isSelected = category.types.some((t) => t.type === selectedCategory);
            
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.types[0].type)}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                  isSelected
                    ? "border-brand bg-brand-light"
                    : "border-border hover:border-text-tertiary hover:bg-surface-subtle"
                )}
              >
                <IconComponent className={cn(
                  "h-5 w-5 mt-0.5 flex-shrink-0",
                  isSelected ? "text-brand" : "text-text-tertiary"
                )} />
                <div>
                  <div className={cn(
                    "font-medium text-sm",
                    isSelected ? "text-brand" : "text-text-primary"
                  )}>
                    {category.name}
                  </div>
                  <div className="text-xs text-text-secondary line-clamp-2">
                    {category.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Type Selection (if category has multiple types) */}
      {selectedCategory && (
        <div className="space-y-3">
          {(() => {
            const category = DOCUMENT_CATEGORIES.find((c) => 
              c.types.some((t) => t.type === selectedCategory)
            );
            if (!category || category.types.length <= 1) return null;
            
            return (
              <>
                <label className="text-sm font-medium text-text-primary">
                  Specific type:
                </label>
                <div className="flex flex-wrap gap-2">
                  {category.types.map((typeInfo) => (
                    <Badge
                      key={typeInfo.type}
                      variant={selectedCategory === typeInfo.type ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedCategory(typeInfo.type)}
                    >
                      {typeInfo.label}
                    </Badge>
                  ))}
                </div>
              </>
            );
          })()}
          
          {/* Tips for selected type */}
          {selectedTypeInfo && (
            <div className="bg-surface-secondary rounded-lg p-4 space-y-2">
              <div className="font-medium text-sm text-text-primary">
                {selectedTypeInfo.label}
              </div>
              <p className="text-sm text-text-secondary">
                {selectedTypeInfo.description}
              </p>
              {selectedTypeInfo.examples.length > 0 && (
                <div className="text-xs text-text-tertiary">
                  Examples: {selectedTypeInfo.examples.join(", ")}
                </div>
              )}
              {selectedTypeInfo.tips.length > 0 && (
                <div className="pt-2 border-t border-border mt-2">
                  <div className="text-xs font-medium text-text-secondary mb-1">Tips:</div>
                  <ul className="text-xs text-text-tertiary space-y-1">
                    {selectedTypeInfo.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-brand">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive 
            ? "border-brand bg-brand-light" 
            : "border-border hover:border-text-tertiary",
          !selectedCategory && "opacity-50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 text-text-tertiary mx-auto mb-4" />
        {isDragActive ? (
          <p className="text-brand">Drop files here...</p>
        ) : (
          <>
            <p className="text-text-secondary mb-1">
              {selectedCategory 
                ? "Drag and drop files here, or click to select"
                : "Select a document type above, then drop files here"}
            </p>
            <p className="text-sm text-text-tertiary">PDF, DOCX, or TXT up to 50MB</p>
          </>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-text-primary">
            Files to upload ({files.length})
          </div>
          
          {files.map((fileWithMeta, index) => {
            const typeInfo = ALL_DOCUMENT_TYPES.find((t) => t.type === fileWithMeta.documentType);
            
            return (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-4 p-3 border rounded-lg",
                  fileWithMeta.status === "success" && "bg-status-success/5 border-status-success/20",
                  fileWithMeta.status === "error" && "bg-status-error/5 border-status-error/20",
                  fileWithMeta.status === "pending" && "border-border bg-surface-subtle",
                  fileWithMeta.status === "uploading" && "border-brand/20 bg-brand-light"
                )}
              >
                <File className="h-8 w-8 text-text-tertiary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary truncate">
                      {fileWithMeta.file.name}
                    </span>
                    <span className="text-sm text-text-secondary">
                      ({formatFileSize(fileWithMeta.file.size)})
                    </span>
                  </div>
                  {fileWithMeta.status === "uploading" && (
                    <Progress value={fileWithMeta.progress} className="h-1 mt-2" />
                  )}
                  {fileWithMeta.status === "error" && (
                    <p className="text-sm text-status-error mt-1">{fileWithMeta.error}</p>
                  )}
                </div>
                
                {fileWithMeta.status === "pending" && (
                  <Select
                    value={fileWithMeta.documentType}
                    onValueChange={(value) => updateFileType(index, value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue>
                        {typeInfo?.label || "Select type"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_CATEGORIES.map((category) => (
                        <div key={category.id}>
                          <div className="px-2 py-1.5 text-xs font-medium text-text-tertiary">
                            {category.name}
                          </div>
                          {category.types.map((type) => (
                            <SelectItem key={type.type} value={type.type}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                {fileWithMeta.status === "success" && (
                  <CheckCircle className="h-5 w-5 text-status-success" />
                )}
                {fileWithMeta.status === "error" && (
                  <AlertCircle className="h-5 w-5 text-status-error" />
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
            );
          })}

          {pendingFiles.length > 0 && (
            <div className="flex justify-end">
              <Button onClick={uploadFiles} loading={isUploading}>
                {isUploading ? "Uploading..." : `Upload ${pendingFiles.length} file(s)`}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
