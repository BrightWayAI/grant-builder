"use client";

/**
 * InlineCitation Component
 * 
 * Perplexity-style inline source citations.
 * - Superscript numbers that indicate sourced content
 * - Hover to see quick preview
 * - Click to open source panel
 */

import { useState } from "react";
import {
  FileText,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CitationSource {
  citationNumber: number;
  documentId: string;
  documentName: string;
  documentType?: string;
  matchedText: string;
  similarity: number;
  pageNumber?: number;
  chunkId?: string;
}

interface InlineCitationProps {
  citation: CitationSource;
  onViewDocument?: (documentId: string) => void;
  className?: string;
}

function getSimilarityColor(similarity: number): string {
  if (similarity >= 0.85) return "text-green-600";
  if (similarity >= 0.70) return "text-yellow-600";
  return "text-orange-600";
}

function getSimilarityLabel(similarity: number): string {
  if (similarity >= 0.85) return "Strong match";
  if (similarity >= 0.70) return "Good match";
  return "Partial match";
}

export function InlineCitation({
  citation,
  onViewDocument,
  className,
}: InlineCitationProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(citation.matchedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const similarityPercent = Math.round(citation.similarity * 100);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center justify-center",
            "min-w-[18px] h-[18px] px-1",
            "text-[10px] font-semibold",
            "bg-blue-100 text-blue-700 rounded-sm",
            "hover:bg-blue-200 transition-colors",
            "align-super cursor-pointer",
            "border border-blue-200",
            className
          )}
          title={`Source: ${citation.documentName}`}
        >
          {citation.citationNumber}
        </button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="start">
        {/* Header */}
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {citation.documentName}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {citation.pageNumber && (
                  <span className="text-xs text-muted-foreground">
                    Page {citation.pageNumber}
                  </span>
                )}
                <span className={cn("text-xs font-medium", getSimilarityColor(citation.similarity))}>
                  {similarityPercent}% match
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Matched text */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Matched content:
            </span>
            <div className={cn(
              "flex items-center gap-1 text-xs",
              getSimilarityColor(citation.similarity)
            )}>
              {citation.similarity >= 0.70 ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              {getSimilarityLabel(citation.similarity)}
            </div>
          </div>
          
          <div className="relative">
            <blockquote className="text-sm bg-muted/50 rounded-md p-3 border-l-2 border-blue-400 italic">
              "{citation.matchedText}"
            </blockquote>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1 rounded hover:bg-muted transition-colors"
              title="Copy text"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
        
        {/* Actions */}
        <div className="p-3 border-t bg-muted/30">
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => onViewDocument?.(citation.documentId)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View full document
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Source badge for sidebar display
 */
export function SourceBadge({
  citation,
  onClick,
  compact = false,
}: {
  citation: CitationSource;
  onClick?: () => void;
  compact?: boolean;
}) {
  const similarityPercent = Math.round(citation.similarity * 100);
  
  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs",
          "bg-blue-50 text-blue-700 border border-blue-200",
          "hover:bg-blue-100 transition-colors"
        )}
      >
        <span className="font-semibold">{citation.citationNumber}</span>
        <span className="truncate max-w-[100px]">{citation.documentName}</span>
      </button>
    );
  }
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-start gap-2 p-2 rounded-md w-full text-left",
        "bg-muted/50 hover:bg-muted transition-colors",
        "border border-transparent hover:border-border"
      )}
    >
      <span className={cn(
        "flex items-center justify-center",
        "min-w-[20px] h-5 px-1",
        "text-xs font-semibold",
        "bg-blue-100 text-blue-700 rounded",
      )}>
        {citation.citationNumber}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{citation.documentName}</p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          "{citation.matchedText}"
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn("text-xs", getSimilarityColor(citation.similarity))}>
            {similarityPercent}% match
          </span>
          {citation.pageNumber && (
            <span className="text-xs text-muted-foreground">
              p. {citation.pageNumber}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
