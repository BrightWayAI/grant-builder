"use client";

/**
 * PlaceholderChip Component
 * 
 * Replaces ugly [[PLACEHOLDER:TYPE:description:id]] text with interactive UI chips.
 * Users can click to resolve placeholders by:
 * - Entering manual values
 * - Searching knowledge base
 * - Marking as verified with attestation
 */

import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  MessageSquare,
  Search,
  Check,
  X,
  ChevronDown,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type PlaceholderType = "MISSING_DATA" | "VERIFICATION_NEEDED" | "USER_INPUT_REQUIRED";

export interface PlaceholderData {
  id: string;
  type: PlaceholderType;
  description: string;
  originalClaim?: string;
}

interface PlaceholderChipProps {
  placeholder: PlaceholderData;
  onResolve: (id: string, value: string) => void;
  onDismiss?: (id: string) => void;
  className?: string;
}

const TYPE_CONFIG = {
  MISSING_DATA: {
    icon: AlertCircle,
    label: "Required",
    color: "text-red-700",
    bgColor: "bg-red-100",
    borderColor: "border-red-300",
    hoverColor: "hover:bg-red-200",
    description: "This information is required before export",
    blocking: true,
  },
  VERIFICATION_NEEDED: {
    icon: AlertTriangle,
    label: "Needs verification",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    borderColor: "border-amber-300",
    hoverColor: "hover:bg-amber-200",
    description: "This claim could not be verified against your knowledge base",
    blocking: true,
  },
  USER_INPUT_REQUIRED: {
    icon: MessageSquare,
    label: "Your input needed",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-300",
    hoverColor: "hover:bg-blue-200",
    description: "Please provide this information based on your knowledge",
    blocking: false,
  },
};

export function PlaceholderChip({
  placeholder,
  onResolve,
  onDismiss,
  className,
}: PlaceholderChipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [attested, setAttested] = useState(false);
  const [mode, setMode] = useState<"input" | "search">("input");

  const config = TYPE_CONFIG[placeholder.type];
  const Icon = config.icon;

  const handleResolve = () => {
    if (!inputValue.trim()) return;
    if (placeholder.type === "VERIFICATION_NEEDED" && !attested) return;
    
    onResolve(placeholder.id, inputValue.trim());
    setIsOpen(false);
    setInputValue("");
    setAttested(false);
  };

  const truncatedDescription = placeholder.description.length > 40
    ? placeholder.description.slice(0, 40) + "..."
    : placeholder.description;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium border transition-colors cursor-pointer",
            config.bgColor,
            config.borderColor,
            config.color,
            config.hoverColor,
            className
          )}
        >
          <Icon className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="max-w-[200px] truncate">{truncatedDescription}</span>
          <ChevronDown className="h-3 w-3 flex-shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-start gap-2">
            <Icon className={cn("h-5 w-5 mt-0.5", config.color)} />
            <div className="flex-1 min-w-0">
              <p className={cn("font-medium text-sm", config.color)}>
                {config.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {config.description}
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-3 space-y-3">
          {/* Original claim if available */}
          {placeholder.originalClaim && (
            <div className="bg-muted/50 rounded-md p-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Original (unverified):
              </p>
              <p className="text-sm italic">"{placeholder.originalClaim}"</p>
            </div>
          )}
          
          {/* What's needed */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              What's needed:
            </p>
            <p className="text-sm">{placeholder.description}</p>
          </div>
          
          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-muted rounded-md">
            <button
              onClick={() => setMode("input")}
              className={cn(
                "flex-1 text-xs py-1.5 px-2 rounded transition-colors",
                mode === "input" 
                  ? "bg-background shadow-sm font-medium" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Enter manually
            </button>
            <button
              onClick={() => setMode("search")}
              className={cn(
                "flex-1 text-xs py-1.5 px-2 rounded transition-colors",
                mode === "search" 
                  ? "bg-background shadow-sm font-medium" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Search KB
            </button>
          </div>
          
          {mode === "input" ? (
            <>
              {/* Input field */}
              <Textarea
                placeholder={`Enter ${placeholder.description.toLowerCase()}...`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="min-h-[80px] text-sm"
              />
              
              {/* Attestation checkbox for verification needed */}
              {placeholder.type === "VERIFICATION_NEEDED" && (
                <label className="flex items-start gap-2 text-xs">
                  <Checkbox
                    checked={attested}
                    onCheckedChange={(checked) => setAttested(checked === true)}
                    className="mt-0.5"
                  />
                  <span className="text-muted-foreground">
                    I verify this information is accurate and from a reliable source
                  </span>
                </label>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search knowledge base..."
                  className="pl-9 text-sm"
                />
              </div>
              <div className="text-xs text-muted-foreground text-center py-4">
                Search results will appear here
              </div>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="p-3 border-t bg-muted/30 flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleResolve}
            disabled={!inputValue.trim() || (placeholder.type === "VERIFICATION_NEEDED" && !attested)}
            className="flex-1"
          >
            <Check className="h-4 w-4 mr-1" />
            Resolve
          </Button>
          {onDismiss && placeholder.type !== "MISSING_DATA" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onDismiss(placeholder.id);
                setIsOpen(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Parse [[PLACEHOLDER:TYPE:description:id]] syntax from text
 * ID can contain underscores and alphanumeric characters
 */
export function parsePlaceholders(text: string): {
  segments: Array<{ type: "text" | "placeholder"; content: string; placeholder?: PlaceholderData }>;
} {
  const regex = /\[\[PLACEHOLDER:(\w+):([^:\[\]]+):([\w_]+)\]\]/g;
  const segments: Array<{ type: "text" | "placeholder"; content: string; placeholder?: PlaceholderData }> = [];
  
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    // Add text before placeholder
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }
    
    // Add placeholder
    const [fullMatch, type, description, id] = match;
    segments.push({
      type: "placeholder",
      content: fullMatch,
      placeholder: {
        id,
        type: type as PlaceholderType,
        description,
      },
    });
    
    lastIndex = match.index + fullMatch.length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }
  
  return { segments };
}

/**
 * Render text with placeholder chips
 */
export function TextWithPlaceholders({
  text,
  onResolvePlaceholder,
  onDismissPlaceholder,
}: {
  text: string;
  onResolvePlaceholder: (id: string, value: string) => void;
  onDismissPlaceholder?: (id: string) => void;
}) {
  const { segments } = parsePlaceholders(text);
  
  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={index}>{segment.content}</span>;
        }
        
        if (segment.placeholder) {
          return (
            <PlaceholderChip
              key={segment.placeholder.id}
              placeholder={segment.placeholder}
              onResolve={onResolvePlaceholder}
              onDismiss={onDismissPlaceholder}
            />
          );
        }
        
        return null;
      })}
    </>
  );
}
