"use client";

/**
 * SectionContentView Component
 * 
 * Displays section content with:
 * - Interactive placeholder chips (click to resolve)
 * - Perplexity-style inline citations (hover/click for source)
 * - Source panel slide-out
 * - Document viewer modal
 * 
 * This is used alongside ProposalEditor to show the annotated view of content.
 */

import { useState, useEffect, useCallback } from "react";
import { ContentRenderer, ContentData } from "./content-renderer";
import { SourcePanel } from "./source-panel";
import { DocumentViewerModal } from "./document-viewer-modal";
import { CitationSource } from "./inline-citation";
import { PlaceholderData } from "./placeholder-chip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  FileText,
  Eye,
  Edit3,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionContentViewProps {
  sectionId: string;
  sectionName: string;
  content: string;
  proposalId: string;
  onContentChange: (newContent: string) => void;
  onSave: (content: string) => void;
  className?: string;
}

interface SectionCitationData {
  citations: CitationSource[];
  placeholders: PlaceholderData[];
  metadata: {
    retrievedChunkCount: number;
    claimsReplaced: number;
    paragraphsPlaceholdered: number;
    enforcementApplied: boolean;
  };
}

export function SectionContentView({
  sectionId,
  sectionName,
  content,
  proposalId,
  onContentChange,
  onSave,
  className,
}: SectionContentViewProps) {
  const { toast } = useToast();
  const [citationData, setCitationData] = useState<SectionCitationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSourcePanel, setShowSourcePanel] = useState(false);
  const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(null);
  const [highlightText, setHighlightText] = useState<string | undefined>();

  // Fetch citation data on mount and when sectionId changes
  useEffect(() => {
    if (sectionId) {
      fetchCitationData();
    }
  }, [sectionId]);

  const fetchCitationData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/proposals/${proposalId}/sections/${sectionId}/citations`
      );
      if (response.ok) {
        const data = await response.json();
        setCitationData(data);
      }
    } catch (error) {
      console.error("Failed to fetch citation data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle placeholder resolution
  const handleResolvePlaceholder = useCallback(
    (placeholderId: string, value: string) => {
      // Find the placeholder pattern in content and replace it
      const placeholderRegex = new RegExp(
        `\\[\\[PLACEHOLDER:\\w+:[^:]+:${placeholderId}\\]\\]`,
        "g"
      );
      
      const newContent = content.replace(placeholderRegex, value);
      
      if (newContent !== content) {
        onContentChange(newContent);
        onSave(newContent);
        
        toast({
          title: "Placeholder resolved",
          description: "Your content has been updated and saved.",
        });
        
        // Refresh citation data
        fetchCitationData();
      }
    },
    [content, onContentChange, onSave, toast]
  );

  // Handle placeholder dismissal (for non-blocking placeholders)
  const handleDismissPlaceholder = useCallback(
    (placeholderId: string) => {
      // Find and remove the placeholder
      const placeholderRegex = new RegExp(
        `\\[\\[PLACEHOLDER:USER_INPUT_REQUIRED:[^:]+:${placeholderId}\\]\\]`,
        "g"
      );
      
      const newContent = content.replace(placeholderRegex, "");
      
      if (newContent !== content) {
        onContentChange(newContent);
        onSave(newContent);
      }
    },
    [content, onContentChange, onSave]
  );

  // Handle document view
  const handleViewDocument = useCallback((documentId: string, matchedText?: string) => {
    setViewingDocumentId(documentId);
    setHighlightText(matchedText);
  }, []);

  // Convert HTML content to plain text for ContentRenderer
  const getPlainTextContent = (html: string): string => {
    if (!html) return "";
    
    // Simple HTML to text conversion
    const temp = typeof document !== "undefined" 
      ? document.createElement("div") 
      : null;
    
    if (!temp) return html.replace(/<[^>]*>/g, "");
    
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  };

  // Build content data for ContentRenderer
  const contentData: ContentData = {
    rawContent: getPlainTextContent(content),
    citations: citationData?.citations || [],
    placeholders: citationData?.placeholders || [],
  };

  const hasPlaceholders = (citationData?.placeholders?.length || 0) > 0;
  const hasCitations = (citationData?.citations?.length || 0) > 0;

  return (
    <div className={cn("relative", className)}>
      {/* Header with stats */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b">
        <div className="flex items-center gap-3">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <>
              {hasCitations && (
                <Badge variant="secondary" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  {citationData?.citations.length} sources
                </Badge>
              )}
              {hasPlaceholders && (
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                  {citationData?.placeholders.length} placeholders
                </Badge>
              )}
              {citationData?.metadata.enforcementApplied && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  Verified
                </Badge>
              )}
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchCitationData}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          {hasCitations && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSourcePanel(true)}
            >
              <Eye className="h-4 w-4 mr-1" />
              View sources
            </Button>
          )}
        </div>
      </div>

      {/* Content with annotations */}
      <div className="prose prose-sm max-w-none">
        {content ? (
          <ContentRenderer
            content={contentData}
            onResolvePlaceholder={handleResolvePlaceholder}
            onDismissPlaceholder={handleDismissPlaceholder}
            onViewDocument={(docId) => {
              const citation = citationData?.citations.find(c => c.documentId === docId);
              handleViewDocument(docId, citation?.matchedText);
            }}
            onViewAllSources={() => setShowSourcePanel(true)}
            showParagraphBadges={false}
            showSourcesFooter={true}
          />
        ) : (
          <p className="text-muted-foreground italic">
            No content yet. Generate or write content to see annotations.
          </p>
        )}
      </div>

      {/* Source panel slide-out */}
      {showSourcePanel && citationData && (
        <div className="fixed inset-y-0 right-0 w-96 z-50 shadow-xl">
          <SourcePanel
            sectionName={sectionName}
            citations={citationData.citations}
            coverageScore={
              citationData.metadata.retrievedChunkCount > 0
                ? Math.round((citationData.citations.length / citationData.metadata.retrievedChunkCount) * 100)
                : undefined
            }
            onViewDocument={(docId) => {
              const citation = citationData.citations.find(c => c.documentId === docId);
              handleViewDocument(docId, citation?.matchedText);
            }}
            onClose={() => setShowSourcePanel(false)}
          />
        </div>
      )}

      {/* Document viewer modal */}
      <DocumentViewerModal
        open={!!viewingDocumentId}
        onOpenChange={(open) => {
          if (!open) {
            setViewingDocumentId(null);
            setHighlightText(undefined);
          }
        }}
        documentId={viewingDocumentId}
        highlightText={highlightText}
      />
    </div>
  );
}
