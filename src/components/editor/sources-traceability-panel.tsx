"use client";

/**
 * SourcesTraceabilityPanel Component
 * 
 * Shows sources backing specific content in the editor.
 * - Displays sources for selected text or full section
 * - Shows similarity scores and matched excerpts
 * - Highlights unsourced claims
 * - Links to view full documents
 */

import { useState, useEffect } from "react";
import {
  FileText,
  X,
  Search,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Info,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SourceMatch {
  documentId: string;
  documentName: string;
  matchedText: string;
  similarity: number;
  pageNumber?: number;
}

interface TracedContent {
  text: string;
  sources: SourceMatch[];
  status: "grounded" | "partial" | "ungrounded";
}

interface SourcesTraceabilityPanelProps {
  sectionId: string;
  sectionName: string;
  sectionContent: string;
  selectedText: string;
  proposalId: string;
  onViewDocument: (documentId: string, matchedText?: string) => void;
  onClose: () => void;
}

export function SourcesTraceabilityPanel({
  sectionId,
  sectionName,
  sectionContent,
  selectedText,
  proposalId,
  onViewDocument,
  onClose,
}: SourcesTraceabilityPanelProps) {
  const [loading, setLoading] = useState(false);
  const [tracedContent, setTracedContent] = useState<TracedContent[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set([0]));
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchSources();
  }, [sectionId, selectedText]);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/proposals/${proposalId}/sections/${sectionId}/trace`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: selectedText || sectionContent,
            fullSection: !selectedText,
          }),
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setTracedContent(data.traced || []);
      }
    } catch (error) {
      console.error("Failed to fetch sources:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.85) return "text-green-600";
    if (similarity >= 0.70) return "text-yellow-600";
    return "text-orange-600";
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "grounded":
        return { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", label: "Sourced" };
      case "partial":
        return { icon: Info, color: "text-yellow-600", bg: "bg-yellow-50", label: "Partial" };
      case "ungrounded":
        return { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", label: "Unsourced" };
      default:
        return { icon: Info, color: "text-gray-600", bg: "bg-gray-50", label: "Unknown" };
    }
  };

  const filteredContent = tracedContent.filter(
    (item) =>
      !searchQuery ||
      item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sources.some((s) =>
        s.documentName.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const stats = {
    grounded: tracedContent.filter((t) => t.status === "grounded").length,
    partial: tracedContent.filter((t) => t.status === "partial").length,
    ungrounded: tracedContent.filter((t) => t.status === "ungrounded").length,
  };

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold text-sm">Source Traceability</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedText ? "Selected text" : sectionName}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats summary */}
      <div className="p-3 border-b bg-muted/30">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            <span>{stats.grounded} sourced</span>
          </div>
          <div className="flex items-center gap-1">
            <Info className="h-3 w-3 text-yellow-600" />
            <span>{stats.partial} partial</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-red-600" />
            <span>{stats.ungrounded} unsourced</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search content or sources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Content list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredContent.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {searchQuery ? "No matches found" : "No content to trace"}
          </div>
        ) : (
          <div className="divide-y">
            {filteredContent.map((item, index) => {
              const config = getStatusConfig(item.status);
              const StatusIcon = config.icon;
              const isExpanded = expandedItems.has(index);

              return (
                <div key={index} className={cn("", item.status === "ungrounded" && "bg-red-50/50")}>
                  <button
                    onClick={() => toggleExpanded(index)}
                    className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <StatusIcon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", config.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2">{item.text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={cn("text-[10px] py-0", config.bg, config.color)}>
                            {config.label}
                          </Badge>
                          {item.sources.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {item.sources.length} source{item.sources.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 ml-6 space-y-2">
                      {item.sources.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2">
                          No supporting sources found in knowledge base
                        </p>
                      ) : (
                        item.sources.map((source, sourceIndex) => (
                          <div
                            key={sourceIndex}
                            className="p-2 rounded-md bg-muted/50 border border-transparent hover:border-border transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs font-medium truncate">
                                  {source.documentName}
                                </span>
                              </div>
                              <span className={cn("text-xs font-medium", getSimilarityColor(source.similarity))}>
                                {Math.round(source.similarity * 100)}%
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 italic">
                              "{source.matchedText}"
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs mt-1.5 -ml-2"
                              onClick={() => onViewDocument(source.documentId, source.matchedText)}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View source
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t bg-muted/30">
        <p className="text-[10px] text-muted-foreground text-center">
          Sources are matched using semantic similarity from your knowledge base
        </p>
      </div>
    </div>
  );
}
