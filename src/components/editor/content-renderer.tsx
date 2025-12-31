"use client";

/**
 * ContentRenderer Component
 * 
 * Renders generated content with:
 * - Placeholder chips (interactive, resolvable)
 * - Inline citations (Perplexity-style superscripts)
 * - Paragraph grounding indicators
 * 
 * This replaces raw text rendering with rich, interactive content.
 */

import { useState, useMemo } from "react";
import { PlaceholderChip, PlaceholderData, PlaceholderType } from "./placeholder-chip";
import { InlineCitation, CitationSource } from "./inline-citation";
import { SourcesFooter } from "./source-panel";
import { ParagraphBadge, GroundingStatus } from "./paragraph-badge";
import { cn } from "@/lib/utils";

export interface ParagraphData {
  index: number;
  status: GroundingStatus;
  similarity: number;
  citations: CitationSource[];
}

export interface ContentData {
  rawContent: string;
  paragraphs?: ParagraphData[];
  citations?: CitationSource[];
  placeholders?: PlaceholderData[];
}

interface ContentRendererProps {
  content: ContentData;
  onResolvePlaceholder: (id: string, value: string) => void;
  onDismissPlaceholder?: (id: string) => void;
  onViewDocument?: (documentId: string) => void;
  onViewAllSources?: () => void;
  showParagraphBadges?: boolean;
  showSourcesFooter?: boolean;
  className?: string;
}

/**
 * Parse content into segments with placeholders and citations
 */
function parseContent(
  text: string,
  citations: CitationSource[] = []
): Array<{
  type: "text" | "placeholder" | "citation";
  content: string;
  data?: PlaceholderData | CitationSource;
}> {
  // First, find all placeholders and citation markers
  const segments: Array<{
    type: "text" | "placeholder" | "citation";
    content: string;
    start: number;
    end: number;
    data?: PlaceholderData | CitationSource;
  }> = [];

  // Find placeholders: [[PLACEHOLDER:TYPE:description:id]]
  const placeholderRegex = /\[\[PLACEHOLDER:(\w+):([^:]+):(\w+)\]\]/g;
  let match;
  while ((match = placeholderRegex.exec(text)) !== null) {
    segments.push({
      type: "placeholder",
      content: match[0],
      start: match.index,
      end: match.index + match[0].length,
      data: {
        id: match[3],
        type: match[1] as PlaceholderType,
        description: match[2],
      } as PlaceholderData,
    });
  }

  // Find citation markers: [¹] or [1] style
  // We'll use a simple format: {{cite:N}} which we inject during generation
  const citationRegex = /\{\{cite:(\d+)\}\}/g;
  while ((match = citationRegex.exec(text)) !== null) {
    const citationNum = parseInt(match[1], 10);
    const citation = citations.find(c => c.citationNumber === citationNum);
    if (citation) {
      segments.push({
        type: "citation",
        content: match[0],
        start: match.index,
        end: match.index + match[0].length,
        data: citation,
      });
    }
  }

  // Sort by position
  segments.sort((a, b) => a.start - b.start);

  // Build final segments with text in between
  const result: Array<{
    type: "text" | "placeholder" | "citation";
    content: string;
    data?: PlaceholderData | CitationSource;
  }> = [];

  let lastEnd = 0;
  for (const seg of segments) {
    // Add text before this segment
    if (seg.start > lastEnd) {
      result.push({
        type: "text",
        content: text.slice(lastEnd, seg.start),
      });
    }
    
    result.push({
      type: seg.type,
      content: seg.content,
      data: seg.data,
    });
    
    lastEnd = seg.end;
  }

  // Add remaining text
  if (lastEnd < text.length) {
    result.push({
      type: "text",
      content: text.slice(lastEnd),
    });
  }

  return result;
}

/**
 * Split content into paragraphs
 */
function splitIntoParagraphs(text: string): string[] {
  return text.split(/\n\n+/).filter(p => p.trim().length > 0);
}

export function ContentRenderer({
  content,
  onResolvePlaceholder,
  onDismissPlaceholder,
  onViewDocument,
  onViewAllSources,
  showParagraphBadges = true,
  showSourcesFooter = true,
  className,
}: ContentRendererProps) {
  const paragraphTexts = useMemo(
    () => splitIntoParagraphs(content.rawContent),
    [content.rawContent]
  );

  return (
    <div className={cn("space-y-4", className)}>
      {paragraphTexts.map((paraText, paraIndex) => {
        const paraData = content.paragraphs?.[paraIndex];
        const segments = parseContent(paraText, content.citations);
        
        return (
          <div key={paraIndex} className="group relative">
            {/* Paragraph badge */}
            {showParagraphBadges && paraData && (
              <div className="absolute -left-8 top-0">
                <ParagraphBadge
                  status={paraData.status}
                  similarity={paraData.similarity}
                  supportingChunks={paraData.citations?.map(c => ({
                    documentName: c.documentName,
                    similarity: c.similarity,
                  }))}
                />
              </div>
            )}
            
            {/* Paragraph content */}
            <p className={cn(
              "text-sm leading-relaxed",
              paraData?.status === "UNGROUNDED" && "bg-red-50/50 -mx-2 px-2 py-1 rounded border-l-2 border-red-300",
              paraData?.status === "PARTIAL" && "bg-yellow-50/30 -mx-2 px-2 py-1 rounded border-l-2 border-yellow-300",
            )}>
              {segments.map((segment, segIndex) => {
                if (segment.type === "text") {
                  return <span key={segIndex}>{segment.content}</span>;
                }
                
                if (segment.type === "placeholder" && segment.data) {
                  return (
                    <PlaceholderChip
                      key={segIndex}
                      placeholder={segment.data as PlaceholderData}
                      onResolve={onResolvePlaceholder}
                      onDismiss={onDismissPlaceholder}
                    />
                  );
                }
                
                if (segment.type === "citation" && segment.data) {
                  return (
                    <InlineCitation
                      key={segIndex}
                      citation={segment.data as CitationSource}
                      onViewDocument={onViewDocument}
                    />
                  );
                }
                
                return null;
              })}
            </p>
          </div>
        );
      })}

      {/* Sources footer */}
      {showSourcesFooter && content.citations && content.citations.length > 0 && (
        <SourcesFooter
          citations={content.citations}
          onViewAll={onViewAllSources || (() => {})}
          onViewDocument={onViewDocument || (() => {})}
        />
      )}
    </div>
  );
}

/**
 * Simple text renderer with just placeholder support
 * For use in contexts where we don't have full paragraph data
 */
export function SimpleContentRenderer({
  text,
  onResolvePlaceholder,
  onDismissPlaceholder,
  className,
}: {
  text: string;
  onResolvePlaceholder: (id: string, value: string) => void;
  onDismissPlaceholder?: (id: string) => void;
  className?: string;
}) {
  const segments = parseContent(text);
  
  return (
    <div className={className}>
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          // Preserve line breaks
          return (
            <span key={index}>
              {segment.content.split('\n').map((line, lineIndex, arr) => (
                <span key={lineIndex}>
                  {line}
                  {lineIndex < arr.length - 1 && <br />}
                </span>
              ))}
            </span>
          );
        }
        
        if (segment.type === "placeholder" && segment.data) {
          return (
            <PlaceholderChip
              key={index}
              placeholder={segment.data as PlaceholderData}
              onResolve={onResolvePlaceholder}
              onDismiss={onDismissPlaceholder}
            />
          );
        }
        
        return null;
      })}
    </div>
  );
}
