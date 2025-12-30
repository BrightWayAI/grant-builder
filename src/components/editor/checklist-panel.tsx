"use client";

/**
 * Checklist Panel Component (AC-2.1, AC-2.2)
 * 
 * Displays RFP requirement checklist with section mappings:
 * - Shows all extracted requirements from RFP
 * - Indicates completion status for each item
 * - Allows manual mapping of sections to checklist items
 * - Highlights low-confidence auto-mappings for review
 */

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  Link2,
  Link2Off,
  ChevronRight,
  RefreshCw,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChecklistItem {
  id: string;
  name: string;
  isRequired: boolean;
  status: "COMPLETE" | "INCOMPLETE" | "UNMAPPED" | "NEEDS_REVIEW";
  mappedSections: Array<{
    id: string;
    name: string;
    hasContent: boolean;
    confidence: number | null;
  }>;
}

interface ChecklistPanelProps {
  proposalId: string;
  sections: Array<{ id: string; name: string }>;
  onSectionClick?: (sectionId: string) => void;
  onMappingChange?: () => void;
}

export function ChecklistPanel({
  proposalId,
  sections,
  onSectionClick,
  onMappingChange,
}: ChecklistPanelProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    complete: number;
    incomplete: number;
    needsReview: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [editingMapping, setEditingMapping] = useState<string | null>(null);

  const fetchChecklist = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/proposals/${proposalId}/checklist`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.items);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Failed to fetch checklist:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklist();
  }, [proposalId]);

  const handleMapSection = async (checklistItemId: string, sectionId: string) => {
    try {
      await fetch(`/api/proposals/${proposalId}/checklist/map`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklistItemId, sectionId }),
      });
      setEditingMapping(null);
      fetchChecklist();
      onMappingChange?.();
    } catch (error) {
      console.error("Failed to map section:", error);
    }
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const getStatusIcon = (status: ChecklistItem["status"]) => {
    switch (status) {
      case "COMPLETE":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "INCOMPLETE":
        return <Circle className="h-4 w-4 text-gray-400" />;
      case "UNMAPPED":
        return <Link2Off className="h-4 w-4 text-red-500" />;
      case "NEEDS_REVIEW":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusLabel = (status: ChecklistItem["status"]) => {
    switch (status) {
      case "COMPLETE":
        return "Complete";
      case "INCOMPLETE":
        return "Incomplete";
      case "UNMAPPED":
        return "Not Mapped";
      case "NEEDS_REVIEW":
        return "Review Mapping";
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
        Loading checklist...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No checklist items found.</p>
        <p className="text-xs mt-1">
          Upload an RFP to automatically generate a requirements checklist.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded font-medium",
              summary.complete === summary.total
                ? "bg-green-100 text-green-700"
                : summary.incomplete > 0
                ? "bg-yellow-100 text-yellow-700"
                : "bg-blue-100 text-blue-700"
            )}>
              {summary.complete}/{summary.total}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full flex">
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${(summary.complete / summary.total) * 100}%` }}
              />
              <div
                className="bg-yellow-500 transition-all"
                style={{ width: `${(summary.needsReview / summary.total) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              {summary.complete} complete
            </span>
            {summary.needsReview > 0 && (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                {summary.needsReview} needs review
              </span>
            )}
            {summary.incomplete > 0 && (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-300" />
                {summary.incomplete} incomplete
              </span>
            )}
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="space-y-1">
        {items.map(item => (
          <div
            key={item.id}
            className="border rounded-md overflow-hidden"
          >
            <button
              onClick={() => toggleExpanded(item.id)}
              className={cn(
                "w-full flex items-center gap-2 p-2 hover:bg-muted/50 transition-colors text-left",
                item.status === "UNMAPPED" && "bg-red-50/50",
                item.status === "NEEDS_REVIEW" && "bg-yellow-50/50"
              )}
            >
              {getStatusIcon(item.status)}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className={cn(
                    "text-sm truncate",
                    item.isRequired && "font-medium"
                  )}>
                    {item.name}
                  </span>
                  {item.isRequired && (
                    <span className="text-xs text-red-500">*</span>
                  )}
                </div>
              </div>
              
              <span className={cn(
                "text-xs",
                item.status === "COMPLETE" && "text-green-600",
                item.status === "INCOMPLETE" && "text-gray-500",
                item.status === "UNMAPPED" && "text-red-600",
                item.status === "NEEDS_REVIEW" && "text-yellow-600"
              )}>
                {getStatusLabel(item.status)}
              </span>
              
              <ChevronRight className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                expandedItems.has(item.id) && "rotate-90"
              )} />
            </button>
            
            {expandedItems.has(item.id) && (
              <div className="border-t bg-muted/20 p-2 space-y-2">
                {/* Mapped Sections */}
                {item.mappedSections.length > 0 ? (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Mapped Sections
                    </div>
                    {item.mappedSections.map(section => (
                      <div
                        key={section.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded text-sm",
                          section.hasContent
                            ? "bg-green-50 text-green-800"
                            : "bg-gray-50 text-gray-600"
                        )}
                      >
                        <Link2 className="h-3 w-3" />
                        <button
                          onClick={() => onSectionClick?.(section.id)}
                          className="flex-1 text-left hover:underline truncate"
                        >
                          {section.name}
                        </button>
                        {section.confidence !== null && section.confidence < 0.6 && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                            Low confidence
                          </span>
                        )}
                        {section.hasContent ? (
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                        ) : (
                          <Circle className="h-3 w-3 text-gray-400" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    No sections mapped to this requirement
                  </div>
                )}
                
                {/* Manual Mapping */}
                {editingMapping === item.id ? (
                  <div className="space-y-2">
                    <Select
                      onValueChange={(value) => handleMapSection(item.id, value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select a section to map..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sections.map(section => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingMapping(null)}
                      className="w-full text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingMapping(item.id)}
                    className="w-full text-xs"
                  >
                    <Link2 className="h-3 w-3 mr-1" />
                    {item.mappedSections.length > 0 ? "Change Mapping" : "Map to Section"}
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="text-xs text-muted-foreground border-t pt-3">
        <span className="text-red-500">*</span> = Required by funder
      </div>
    </div>
  );
}
