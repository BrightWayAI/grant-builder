"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/primitives/button";
import { Progress } from "@/components/primitives/progress";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FileText, Loader2 } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { ParsedRFP } from "@/lib/ai/rfp-parser";

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
};

interface RFPUploadProps {
  onParsed: (parsed: ParsedRFP) => void;
}

export function RFPUpload({ onParsed }: RFPUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 50 * 1024 * 1024,
    multiple: false,
  });

  const handleParse = async () => {
    if (!file) return;

    setIsParsing(true);
    setProgress(20);

    try {
      const formData = new FormData();
      formData.append("file", file);

      setProgress(40);

      const response = await fetch("/api/rfp/parse", {
        method: "POST",
        body: formData,
      });

      setProgress(80);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to parse RFP");
      }

      const parsed = await response.json();
      setProgress(100);

      toast({
        title: "RFP parsed successfully",
        description: `Found ${parsed.sections.length} sections`,
      });

      onParsed(parsed);
    } catch (error) {
      toast({
        title: "Error parsing RFP",
        description: error instanceof Error ? error.message : "Failed to parse document",
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-normal",
          isDragActive ? "border-brand bg-brand-light" : "border-border hover:border-text-tertiary",
          file && "border-brand bg-brand-light"
        )}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-brand" />
            <div className="text-left">
              <p className="font-medium text-text-primary">{file.name}</p>
              <p className="text-sm text-text-secondary">{formatFileSize(file.size)}</p>
            </div>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 text-text-tertiary mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-brand">Drop the RFP here...</p>
            ) : (
              <>
                <p className="text-text-secondary mb-1">
                  Drag and drop your RFP here, or click to select
                </p>
                <p className="text-sm text-text-tertiary">PDF, DOCX, or TXT up to 50MB</p>
              </>
            )}
          </>
        )}
      </div>

      {isParsing && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing RFP and extracting requirements...
          </div>
          <Progress value={progress} />
        </div>
      )}

      {file && !isParsing && (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setFile(null)}>
            Remove
          </Button>
          <Button onClick={handleParse}>Parse RFP</Button>
        </div>
      )}
    </div>
  );
}
