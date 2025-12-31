"use client";

/**
 * DocumentViewerModal Component
 * 
 * Modal for viewing source documents with highlighted matched text.
 * Allows users to verify citations by seeing the full source context.
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DocumentChunk {
  id: string;
  content: string;
  chunkIndex: number;
  pageNumber?: number;
}

interface DocumentData {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  chunks: DocumentChunk[];
}

interface DocumentViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string | null;
  highlightText?: string;
  organizationId?: string;
}

export function DocumentViewerModal({
  open,
  onOpenChange,
  documentId,
  highlightText,
  organizationId,
}: DocumentViewerModalProps) {
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedChunkIndex, setHighlightedChunkIndex] = useState<number | null>(null);

  useEffect(() => {
    if (open && documentId) {
      fetchDocument(documentId);
    } else {
      setDocument(null);
      setError(null);
    }
  }, [open, documentId]);

  useEffect(() => {
    // Find chunk containing highlight text
    if (document && highlightText) {
      const normalizedHighlight = highlightText.toLowerCase().slice(0, 50);
      const matchingIndex = document.chunks.findIndex(chunk =>
        chunk.content.toLowerCase().includes(normalizedHighlight)
      );
      if (matchingIndex >= 0) {
        setHighlightedChunkIndex(matchingIndex);
      }
    }
  }, [document, highlightText]);

  const fetchDocument = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch document");
      }
      const data = await response.json();
      setDocument(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load document");
    } finally {
      setLoading(false);
    }
  };

  const highlightMatches = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) {
      // If no search query but we have highlightText, highlight that
      if (highlightText) {
        return highlightMatches(text, highlightText.slice(0, 50));
      }
      return text;
    }

    const parts = text.split(new RegExp(`(${escapeRegex(query)})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const escapeRegex = (str: string) =>
    str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredChunks = document?.chunks.filter(chunk =>
    !searchQuery || chunk.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <DialogTitle className="text-lg">
                  {document?.filename || "Loading..."}
                </DialogTitle>
                {document && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {document.fileType.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(document.fileSize)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {document.chunks.length} chunks
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Search bar */}
        <div className="px-6 py-3 border-b bg-muted/30">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search within document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {highlightText && (
            <p className="text-xs text-muted-foreground mt-2">
              Highlighting: "{highlightText.slice(0, 60)}..."
            </p>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-destructive font-medium">{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => documentId && fetchDocument(documentId)}
              >
                Try again
              </Button>
            </div>
          )}

          {document && !loading && !error && (
            <div className="space-y-4">
              {filteredChunks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No content matches your search
                </p>
              ) : (
                filteredChunks.map((chunk, index) => (
                  <div
                    key={chunk.id}
                    id={`chunk-${index}`}
                    className={cn(
                      "p-4 rounded-lg border transition-colors",
                      highlightedChunkIndex === index
                        ? "bg-yellow-50 border-yellow-300"
                        : "bg-muted/30 border-transparent hover:border-border"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Chunk {chunk.chunkIndex + 1}
                        </span>
                        {chunk.pageNumber && (
                          <Badge variant="outline" className="text-xs">
                            Page {chunk.pageNumber}
                          </Badge>
                        )}
                      </div>
                      {highlightedChunkIndex === index && (
                        <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                          Citation source
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {highlightMatches(chunk.content, searchQuery)}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {document && (
          <div className="px-6 py-3 border-t bg-muted/30 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Uploaded {new Date(document.uploadedAt).toLocaleDateString()}
            </span>
            <div className="flex items-center gap-2">
              {highlightedChunkIndex !== null && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const el = window.document.getElementById(`chunk-${highlightedChunkIndex}`);
                    el?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                >
                  Jump to citation
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
