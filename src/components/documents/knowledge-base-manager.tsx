"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/primitives/button";
import { Label } from "@/components/primitives/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/primitives/select";
import { Progress } from "@/components/primitives/progress";
import { Badge } from "@/components/primitives/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";
import { useToast } from "@/components/ui/use-toast";
import { 
  Upload, 
  File, 
  X, 
  CheckCircle, 
  AlertCircle, 
  FileText,
  Building2,
  Target,
  TrendingUp,
  DollarSign,
  Folder,
  ChevronRight,
  Plus,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { 
  DOCUMENT_CATEGORIES, 
  ALL_DOCUMENT_TYPES, 
  FUNDER_TYPES,
  DocumentCategory,
  getMissingRecommendedTypes,
} from "@/lib/document-categories";
import { DocumentType } from "@prisma/client";

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
};

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
  funderType?: string;
  isRfp?: boolean;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

interface KnowledgeBaseManagerProps {
  organizationId: string;
  existingTypes: DocumentType[];
  categoryDocCounts: Record<string, number>;
}

export function KnowledgeBaseManager({ 
  organizationId, 
  existingTypes,
  categoryDocCounts,
}: KnowledgeBaseManagerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);
  const [selectedFunderType, setSelectedFunderType] = useState<string | null>(null);
  const [files, setFiles] = useState<FileWithMeta[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const uploadRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  const missingRecommended = getMissingRecommendedTypes(existingTypes);
  const isProposalCategory = selectedCategory === "proposals";

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      documentType: selectedType || "PROPOSAL",
      funderType: isProposalCategory ? selectedFunderType || undefined : undefined,
      status: "pending" as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, [selectedType, selectedFunderType, isProposalCategory]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 50 * 1024 * 1024,
  });

  const selectCategory = (category: DocumentCategory) => {
    // Clear files and funder type when switching categories
    setFiles([]);
    setSelectedFunderType(null);
    setSelectedCategory(category.id);
    setSelectedType(category.types[0].type);
    setTimeout(() => {
      uploadRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFile = (index: number, updates: Partial<FileWithMeta>) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f))
    );
  };

  const uploadFiles = async () => {
    const pendingFiles = files.filter((f) => f.status === "pending" && f.file);
    if (pendingFiles.length === 0) return;

    // Validate: proposals require funder type
    if (isProposalCategory) {
      const missingFunderType = pendingFiles.some((f) => !f.isRfp && !f.funderType);
      if (missingFunderType) {
        toast({
          title: "Funder type required",
          description: "Please select a funder type for each proposal before uploading",
          variant: "destructive",
        });
        return;
      }
    }

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const fileWithMeta = files[i];
      if (fileWithMeta.status !== "pending" || !fileWithMeta.file) continue;

      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: "uploading", progress: 10 } : f
        )
      );

      try {
        const formData = new FormData();
        formData.append("file", fileWithMeta.file);
        formData.append("documentType", fileWithMeta.documentType);
        formData.append("organizationId", organizationId);
        if (fileWithMeta.funderType) {
          formData.append("funderType", fileWithMeta.funderType);
        }
        if (fileWithMeta.isRfp) {
          formData.append("isRfp", "true");
        }

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
    
    // Count successes from current state
    const currentFiles = files;
    const successCount = currentFiles.filter((f) => f.status !== "pending" && f.status !== "uploading").length;
    
    if (successCount > 0) {
      toast({
        title: "Upload complete",
        description: `${successCount} file(s) uploaded and queued for indexing`,
      });
      
      // Clear successful files, reset state, and refresh page
      setFiles((prev) => prev.filter((f) => f.status === "error"));
      setSelectedCategory(null);
      setSelectedType(null);
      
      // Force refresh the page data
      router.refresh();
    }
  };

  const pendingFiles = files.filter((f) => f.status === "pending" && f.file);
  const currentCategory = DOCUMENT_CATEGORIES.find((c) => c.id === selectedCategory);

  // Check if all proposals have funder type selected
  const allProposalsHaveFunderType = !isProposalCategory || 
    pendingFiles.every((f) => f.isRfp || f.funderType);

  return (
    <div className="space-y-6">
      {/* Collapsible Recommendations */}
      {missingRecommended.length > 0 && (
        <Card className="border-brand/20 bg-brand-light">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-brand" />
                <CardTitle className="text-base">Recommended Documents</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {missingRecommended.length} missing
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRecommendations(!showRecommendations)}
              >
                {showRecommendations ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {showRecommendations && (
            <CardContent>
              <p className="text-sm text-text-secondary mb-3">
                Upload these high-priority document types to improve proposal generation
              </p>
              <div className="flex flex-wrap gap-2">
                {missingRecommended.map((type) => {
                  const category = DOCUMENT_CATEGORIES.find((c) => 
                    c.types.some((t) => t.type === type.type)
                  );
                  return (
                    <button
                      key={type.type}
                      onClick={() => {
                        if (category) selectCategory(category);
                        setSelectedType(type.type);
                      }}
                      className="flex items-center gap-2 bg-white/80 hover:bg-white rounded-lg px-3 py-2 text-sm transition-colors"
                    >
                      <AlertCircle className="h-4 w-4 text-status-warning" />
                      <span className="font-medium">{type.label}</span>
                      <ChevronRight className="h-3 w-3 text-text-tertiary" />
                    </button>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Document Categories Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <CardDescription>
            Select a category to upload documents. Click any category to start uploading.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DOCUMENT_CATEGORIES.map((category) => {
              const IconComponent = CATEGORY_ICONS[category.icon] || Folder;
              const count = categoryDocCounts[category.id] || 0;
              const hasHighPriority = category.types.some((t) => t.ragPriority === "high");
              const isSelected = selectedCategory === category.id;
              
              return (
                <button
                  key={category.id}
                  onClick={() => selectCategory(category)}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg border text-left transition-all",
                    isSelected
                      ? "border-brand bg-brand-light ring-2 ring-brand/20"
                      : "border-border hover:border-text-tertiary hover:bg-surface-subtle"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg relative",
                    count > 0 ? "bg-status-success/10" : "bg-surface-secondary",
                    isSelected && "bg-brand/10"
                  )}>
                    <IconComponent className={cn(
                      "h-5 w-5",
                      count > 0 ? "text-status-success" : "text-text-tertiary",
                      isSelected && "text-brand"
                    )} />
                    {/* Document count badge on icon */}
                    {count > 0 && (
                      <span className="absolute -top-1 -right-1 bg-status-success text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-medium",
                        isSelected ? "text-brand" : "text-text-primary"
                      )}>
                        {category.name}
                      </span>
                      {hasHighPriority && count === 0 && (
                        <Badge variant="outline" className="text-xs">Priority</Badge>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary mt-0.5 line-clamp-2">
                      {category.description}
                    </p>
                    <div className="mt-2 text-xs">
                      {count > 0 ? (
                        <span className="text-status-success font-medium">
                          {count} document{count !== 1 ? "s" : ""} uploaded
                        </span>
                      ) : (
                        <span className="text-text-tertiary">
                          No documents yet
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={cn(
                    "h-5 w-5 text-text-tertiary mt-1 flex-shrink-0",
                    isSelected && "text-brand"
                  )} />
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upload Area - Shows when category is selected */}
      {selectedCategory && currentCategory && (
        <Card ref={uploadRef}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span>Upload {currentCategory.name}</span>
                  {isProposalCategory && (
                    <Badge variant="outline">+ Optional RFP</Badge>
                  )}
                </CardTitle>
                <CardDescription>{currentCategory.description}</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedType(null);
                  setFiles([]);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Type selector if category has multiple types */}
            {currentCategory.types.length > 1 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Document Type</Label>
                <div className="flex flex-wrap gap-2">
                  {currentCategory.types.map((typeInfo) => (
                    <Badge
                      key={typeInfo.type}
                      variant={selectedType === typeInfo.type ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedType(typeInfo.type)}
                    >
                      {typeInfo.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Funder type for proposals - REQUIRED */}
            {isProposalCategory && (
              <div className="bg-surface-secondary rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-brand" />
                  <span className="text-sm font-medium">Funder Type</span>
                  <Badge variant="default" className="text-xs">Required</Badge>
                </div>
                <p className="text-xs text-text-secondary">
                  Select the type of funder for proposals to help match to future opportunities
                </p>
                <div className="flex flex-wrap gap-2">
                  {FUNDER_TYPES.map((funder) => (
                    <button
                      key={funder.value}
                      type="button"
                      onClick={() => {
                        // Set the selected funder type for new files
                        setSelectedFunderType(funder.value);
                        // Update all pending proposal files with this funder type
                        setFiles((prev) =>
                          prev.map((f) =>
                            f.status === "pending" && !f.isRfp
                              ? { ...f, funderType: funder.value }
                              : f
                          )
                        );
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm border transition-colors",
                        selectedFunderType === funder.value
                          ? "border-brand bg-brand-light text-brand font-medium"
                          : "border-border hover:border-text-tertiary bg-white"
                      )}
                    >
                      {funder.label}
                    </button>
                  ))}
                </div>
                {selectedFunderType && (
                  <p className="text-xs text-status-success">
                    Selected: {FUNDER_TYPES.find((f) => f.value === selectedFunderType)?.description}
                  </p>
                )}
              </div>
            )}

            {/* Tips */}
            {selectedType && (
              <div className="text-sm text-text-secondary bg-surface-subtle rounded-lg p-3">
                <div className="font-medium text-text-primary mb-1">Tips:</div>
                <ul className="space-y-1">
                  {ALL_DOCUMENT_TYPES.find((t) => t.type === selectedType)?.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-brand">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Drop Zone */}
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                isDragActive 
                  ? "border-brand bg-brand-light" 
                  : "border-border hover:border-text-tertiary"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 text-text-tertiary mx-auto mb-4" />
              {isDragActive ? (
                <p className="text-brand">Drop files here...</p>
              ) : (
                <>
                  <p className="text-text-secondary mb-1">
                    Drag and drop files, or click to select
                  </p>
                  <p className="text-sm text-text-tertiary">PDF, DOCX, or TXT up to 50MB</p>
                </>
              )}
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-3">
                {files.map((fileWithMeta, index) => {
                  if (!fileWithMeta.file) return null;
                  const needsFunderType = isProposalCategory && !fileWithMeta.isRfp && !fileWithMeta.funderType;
                  
                  return (
                    <div
                      key={index}
                      className={cn(
                        "p-4 rounded-lg border",
                        fileWithMeta.status === "success" && "bg-status-success/5 border-status-success/20",
                        fileWithMeta.status === "error" && "bg-status-error/5 border-status-error/20",
                        fileWithMeta.status === "pending" && needsFunderType && "border-status-warning bg-status-warning/5",
                        fileWithMeta.status === "pending" && !needsFunderType && "border-border bg-surface-subtle",
                        fileWithMeta.status === "uploading" && "border-brand/20 bg-brand-light"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <File className="h-8 w-8 text-text-tertiary flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-text-primary truncate">
                              {fileWithMeta.file.name}
                            </span>
                            <span className="text-sm text-text-secondary">
                              ({formatFileSize(fileWithMeta.file.size)})
                            </span>
                            {fileWithMeta.isRfp && (
                              <Badge variant="outline" className="text-xs">RFP</Badge>
                            )}
                            {fileWithMeta.funderType && (
                              <Badge variant="default" className="text-xs">
                                {FUNDER_TYPES.find((f) => f.value === fileWithMeta.funderType)?.label}
                              </Badge>
                            )}
                          </div>
                          
                          {fileWithMeta.status === "uploading" && (
                            <Progress value={fileWithMeta.progress} className="h-1 mt-2" />
                          )}
                          
                          {fileWithMeta.status === "error" && (
                            <p className="text-sm text-status-error mt-1">
                              {fileWithMeta.error}
                            </p>
                          )}

                          {/* Funder type selector for proposals - required inline */}
                          {isProposalCategory && fileWithMeta.status === "pending" && !fileWithMeta.isRfp && (
                            <div className="mt-2">
                              <Select
                                value={fileWithMeta.funderType || ""}
                                onValueChange={(value) => updateFile(index, { funderType: value })}
                              >
                                <SelectTrigger className={cn(
                                  "w-56 h-8 text-sm",
                                  needsFunderType && "border-status-warning"
                                )}>
                                  <SelectValue placeholder="Select funder type (required)" />
                                </SelectTrigger>
                                <SelectContent>
                                  {FUNDER_TYPES.map((ft) => (
                                    <SelectItem key={ft.value} value={ft.value}>
                                      <div>
                                        <div>{ft.label}</div>
                                        <div className="text-xs text-text-tertiary">{ft.description}</div>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {needsFunderType && (
                                <p className="text-xs text-status-warning mt-1">
                                  Funder type is required for proposals
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
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
                              className="h-8 w-8"
                              onClick={() => removeFile(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Add RFP drop zone for proposals */}
                      {isProposalCategory && 
                       fileWithMeta.status === "pending" && 
                       !fileWithMeta.isRfp && (
                        <RFPDropZone 
                          onRFPAdded={(rfpFile) => {
                            const newRfpFile: FileWithMeta = {
                              file: rfpFile,
                              documentType: "PROPOSAL",
                              isRfp: true,
                              funderType: fileWithMeta.funderType,
                              status: "pending",
                              progress: 0,
                            };
                            setFiles((prev) => [...prev, newRfpFile]);
                            toast({
                              title: "RFP added",
                              description: "The RFP will be uploaded with your proposal",
                            });
                          }}
                        />
                      )}
                    </div>
                  );
                })}

                {pendingFiles.length > 0 && (
                  <div className="flex items-center justify-between pt-2">
                    {!allProposalsHaveFunderType && (
                      <p className="text-sm text-status-warning flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        Select funder type for all proposals
                      </p>
                    )}
                    <div className="ml-auto">
                      <Button 
                        onClick={uploadFiles} 
                        loading={isUploading}
                        disabled={!allProposalsHaveFunderType}
                      >
                        {isUploading 
                          ? "Uploading..." 
                          : `Upload ${pendingFiles.length} file(s)`}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Mini drop zone for adding an RFP to a proposal
function RFPDropZone({ onRFPAdded }: { onRFPAdded: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      // Check by extension as MIME types can vary
      const ext = file.name.toLowerCase().split('.').pop();
      if (ext === 'pdf' || ext === 'docx' || ext === 'txt' || ext === 'doc') {
        onRFPAdded(file);
      }
    }
  }, [onRFPAdded]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onRFPAdded(file);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <p className="text-xs text-text-tertiary mb-2">
        Have the RFP/grant announcement for this proposal?
      </p>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
          isDragging 
            ? "border-brand bg-brand-light" 
            : "border-border hover:border-text-tertiary"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex items-center justify-center gap-2 text-sm">
          <Plus className="h-4 w-4 text-text-tertiary" />
          <span className={isDragging ? "text-brand" : "text-text-secondary"}>
            {isDragging ? "Drop RFP here" : "Drop RFP or click to select"}
          </span>
        </div>
      </div>
    </div>
  );
}
