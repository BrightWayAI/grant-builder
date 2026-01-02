"use client";

/**
 * SourcePanel Component
 * 
 * Slide-out panel showing all sources used in a section.
 * - Lists all citations with matched text
 * - Shows similarity scores
 * - Links to view full documents
 */

import { useState } from "react";
import {
  FileText,
  ExternalLink,
  X,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CitationSource, SourceBadge } from "./inline-citation";

interface SourcePanelProps {
  sectionName: string;
  citations: CitationSource[];
  coverageScore?: number;
  onViewDocument: (documentId: string) => void;
  onClose: () => void;
  className?: string;
}

export function SourcePanel({
  sectionName,
  citations,
  coverageScore,
  onViewDocument,
  onClose,
  className,
}: SourcePanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCitations, setExpandedCitations] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<"number" | "similarity">("number");

  const filteredCitations = citations
    .filter(c => 
      c.documentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.matchedText.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "similarity") return b.similarity - a.similarity;
      return a.citationNumber - b.citationNumber;
    });

  const toggleExpanded = (num: number) => {
    setExpandedCitations(prev => {
      const next = new Set(prev);
      if (next.has(num)) {
        next.delete(num);
      } else {
        next.add(num);
      }
      return next;
    });
  };

  const highConfidenceCount = citations.filter(c => c.similarity >= 0.85).length;
  const mediumConfidenceCount = citations.filter(c => c.similarity >= 0.70 && c.similarity < 0.85).length;
  const lowConfidenceCount = citations.filter(c => c.similarity < 0.70).length;

  return (
    <div className={cn(
      "flex flex-col h-full bg-background border-l",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div>
          <h3 className="font-semibold text-sm">Sources</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {sectionName}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Coverage summary */}
      {coverageScore !== undefined && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Coverage Score</span>
            <Badge 
              variant="outline"
              className={cn(
                coverageScore >= 60 ? "bg-green-50 text-green-700 border-green-200" :
                coverageScore >= 40 ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                "bg-red-50 text-red-700 border-red-200"
              )}
            >
              {coverageScore}%
            </Badge>
          </div>
          
          {/* Confidence breakdown */}
          <div className="flex gap-3 text-xs">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <span className="text-muted-foreground">{highConfidenceCount} strong</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-yellow-600" />
              <span className="text-muted-foreground">{mediumConfidenceCount} good</span>
            </div>
            <div className="flex items-center gap-1">
              <Info className="h-3 w-3 text-orange-600" />
              <span className="text-muted-foreground">{lowConfidenceCount} partial</span>
            </div>
          </div>
        </div>
      )}

      {/* Search and filter */}
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        
        <div className="flex gap-1">
          <Button
            variant={sortBy === "number" ? "secondary" : "ghost"}
            size="sm"
            className="text-xs h-7"
            onClick={() => setSortBy("number")}
          >
            By order
          </Button>
          <Button
            variant={sortBy === "similarity" ? "secondary" : "ghost"}
            size="sm"
            className="text-xs h-7"
            onClick={() => setSortBy("similarity")}
          >
            By match
          </Button>
        </div>
      </div>

      {/* Citation list */}
      <div className="flex-1 overflow-y-auto">
        {filteredCitations.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {searchQuery ? "No sources match your search" : "No sources for this section"}
          </div>
        ) : (
          <div className="divide-y">
            {filteredCitations.map((citation) => (
              <CitationListItem
                key={citation.citationNumber}
                citation={citation}
                expanded={expandedCitations.has(citation.citationNumber)}
                onToggle={() => toggleExpanded(citation.citationNumber)}
                onViewDocument={onViewDocument}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          {citations.length} source{citations.length !== 1 ? "s" : ""} cited in this section
        </p>
      </div>
    </div>
  );
}

function CitationListItem({
  citation,
  expanded,
  onToggle,
  onViewDocument,
}: {
  citation: CitationSource;
  expanded: boolean;
  onToggle: () => void;
  onViewDocument: (documentId: string) => void;
}) {
  const similarityPercent = Math.round(citation.similarity * 100);
  
  const getSimilarityConfig = (similarity: number) => {
    if (similarity >= 0.85) return { color: "text-green-600", bg: "bg-green-100", label: "Strong" };
    if (similarity >= 0.70) return { color: "text-yellow-600", bg: "bg-yellow-100", label: "Good" };
    return { color: "text-orange-600", bg: "bg-orange-100", label: "Partial" };
  };
  
  const simConfig = getSimilarityConfig(citation.similarity);

  return (
    <div className="group">
      <button
        onClick={onToggle}
        className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          {/* Citation number badge */}
          <span className={cn(
            "flex items-center justify-center",
            "min-w-[24px] h-6 px-1.5",
            "text-xs font-semibold",
            "bg-blue-100 text-blue-700 rounded",
          )}>
            {citation.citationNumber}
          </span>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium truncate">
                {citation.documentName}
              </span>
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded font-medium",
                simConfig.bg,
                simConfig.color
              )}>
                {similarityPercent}% {simConfig.label}
              </span>
              {citation.pageNumber && (
                <span className="text-xs text-muted-foreground">
                  Page {citation.pageNumber}
                </span>
              )}
            </div>
          </div>
          
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      
      {expanded && (
        <div className="px-3 pb-3 ml-9">
          <div className="bg-muted/50 rounded-md p-3 border-l-2 border-blue-400">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Matched text:
            </p>
            <p className="text-sm italic">"{citation.matchedText}"</p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            onClick={() => onViewDocument(citation.documentId)}
          >
            <ExternalLink className="h-3 w-3 mr-2" />
            View document
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline sources footer for editor
 */
export function SourcesFooter({
  citations,
  onViewAll,
  onViewDocument,
}: {
  citations: CitationSource[];
  onViewAll: () => void;
  onViewDocument: (documentId: string) => void;
}) {
  if (citations.length === 0) return null;

  const displayCitations = citations.slice(0, 4);
  const remainingCount = citations.length - displayCitations.length;

  return (
    <div className="border-t mt-4 pt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <FileText className="h-3 w-3" />
          Sources ({citations.length})
        </span>
        <Button variant="ghost" size="sm" className="text-xs h-6" onClick={onViewAll}>
          View all
        </Button>
      </div>
      
      <div className="space-y-1.5">
        {displayCitations.map((citation) => (
          <button
            key={citation.citationNumber}
            onClick={() => onViewDocument(citation.documentId)}
            className="flex items-start gap-2 p-2 rounded-md w-full text-left bg-muted/30 hover:bg-muted transition-colors"
          >
            <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
              {citation.citationNumber}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{citation.documentName}</p>
              <p className="text-xs text-muted-foreground truncate">
                "{citation.matchedText.slice(0, 60)}..."
              </p>
            </div>
            <span className={cn(
              "text-xs",
              citation.similarity >= 0.85 ? "text-green-600" :
              citation.similarity >= 0.70 ? "text-yellow-600" : "text-orange-600"
            )}>
              {Math.round(citation.similarity * 100)}%
            </span>
          </button>
        ))}
        
        {remainingCount > 0 && (
          <button
            onClick={onViewAll}
            className="text-xs text-muted-foreground hover:text-foreground w-full text-center py-1"
          >
            +{remainingCount} more source{remainingCount !== 1 ? "s" : ""}
          </button>
        )}
      </div>
    </div>
  );
}
