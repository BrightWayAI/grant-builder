"use client";

/**
 * EmptyKBState Component
 * 
 * Friendly UI shown when knowledge base has no relevant content
 * for generating a section. Guides user to upload documents.
 */

import { FileText, Upload, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyKBStateProps {
  sectionName: string;
  onWriteManually?: () => void;
}

export function EmptyKBState({ sectionName, onWriteManually }: EmptyKBStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
        <FileText className="h-8 w-8 text-amber-600" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No source documents found
      </h3>
      
      <p className="text-sm text-gray-600 max-w-md mb-6">
        To generate content for <span className="font-medium">"{sectionName}"</span>, 
        upload documents to your knowledge base. This ensures all generated content 
        is grounded in your organization's actual data.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/knowledge-base">
          <Button className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Documents
          </Button>
        </Link>
        
        {onWriteManually && (
          <Button variant="outline" onClick={onWriteManually} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Write Manually
          </Button>
        )}
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg max-w-md">
        <p className="text-xs text-blue-800">
          <strong>Why do we require source documents?</strong>
          <br />
          To prevent AI hallucination, all generated statistics, claims, and facts 
          must be verifiable against your uploaded documents.
        </p>
      </div>
    </div>
  );
}

/**
 * Check if content indicates empty KB state
 */
export function isEmptyKBContent(content: string): { isEmpty: boolean; sectionName?: string } {
  const match = content.match(/\[\[EMPTY_KB:([^\]]+)\]\]/);
  if (match) {
    return { isEmpty: true, sectionName: match[1] };
  }
  return { isEmpty: false };
}

/**
 * Check if content contains placeholders
 */
export function hasPlaceholders(content: string): boolean {
  return /\[\[PLACEHOLDER:/.test(content);
}
