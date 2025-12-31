"use client";

/**
 * SourcesTraceabilityPanel Component
 * 
 * Shows sources backing specific content in the editor.
 * - Displays sources for selected text or full section
 * - Shows similarity scores and matched excerpts
 * - Highlights unsourced claims
 * - Links to view full documents
 * - Shows claim verification status
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
  ShieldCheck,
  ShieldAlert,
  Hash,
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

interface VerifiedClaim {
  id: string;
  type: string;
  value: string;
  context: string;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  status: "VERIFIED" | "UNVERIFIED" | "PARTIAL";
  evidence?: {
    documentId: string;
    documentName: string;
    matchedText: string;
    similarity: number;
  };
}

interface ClaimsSummary {
  totalClaims: number;
  verified: number;
  partial: number;
  unverified: number;
  highRiskUnverified: number;
  verificationRate: number;
  claims: VerifiedClaim[];
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
  const [activeTab, setActiveTab] = useState<"sources" | "claims">("sources");
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimsSummary, setClaimsSummary] = useState<ClaimsSummary | null>(null);
  const [expandedClaims, setExpandedClaims] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSources();
    fetchClaims();
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

  const fetchClaims = async () => {
    setClaimsLoading(true);
    try {
      const response = await fetch(
        `/api/proposals/${proposalId}/sections/${sectionId}/claims`
      );
      
      if (response.ok) {
        const data = await response.json();
        setClaimsSummary(data);
      }
    } catch (error) {
      console.error("Failed to fetch claims:", error);
    } finally {
      setClaimsLoading(false);
    }
  };

  const toggleClaimExpanded = (claimId: string) => {
    setExpandedClaims((prev) => {
      const next = new Set(prev);
      if (next.has(claimId)) {
        next.delete(claimId);
      } else {
        next.add(claimId);
      }
      return next;
    });
  };

  const getClaimStatusConfig = (status: string, riskLevel: string) => {
    if (status === "VERIFIED") {
      return { icon: ShieldCheck, color: "text-green-600", bg: "bg-green-50", label: "Verified" };
    }
    if (status === "PARTIAL") {
      return { icon: Info, color: "text-yellow-600", bg: "bg-yellow-50", label: "Partial match" };
    }
    if (riskLevel === "HIGH") {
      return { icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50", label: "Unverified (High Risk)" };
    }
    return { icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50", label: "Unverified" };
  };

  const getClaimTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      NUMBER: "Number",
      PERCENTAGE: "Percentage",
      CURRENCY: "Currency",
      DATE: "Date",
      NAMED_ORG: "Organization",
      OUTCOME: "Outcome",
    };
    return labels[type] || type;
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
          <h3 className="font-semibold text-sm">Verification</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedText ? "Selected text" : sectionName}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab("sources")}
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "sources"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Sources
        </button>
        <button
          onClick={() => setActiveTab("claims")}
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium transition-colors relative",
            activeTab === "claims"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Claims
          {claimsSummary && claimsSummary.highRiskUnverified > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
              {claimsSummary.highRiskUnverified}
            </span>
          )}
        </button>
      </div>

      {/* Stats summary - Sources tab */}
      {activeTab === "sources" && (
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
      )}

      {/* Stats summary - Claims tab */}
      {activeTab === "claims" && claimsSummary && (
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-green-600" />
              <span>{claimsSummary.verified} verified</span>
            </div>
            <div className="flex items-center gap-1">
              <Info className="h-3 w-3 text-yellow-600" />
              <span>{claimsSummary.partial} partial</span>
            </div>
            <div className="flex items-center gap-1">
              <ShieldAlert className="h-3 w-3 text-red-600" />
              <span>{claimsSummary.unverified} unverified</span>
            </div>
          </div>
          {claimsSummary.highRiskUnverified > 0 && (
            <p className="text-xs text-red-600 mt-2">
              ⚠ {claimsSummary.highRiskUnverified} high-risk claim{claimsSummary.highRiskUnverified !== 1 ? "s" : ""} need verification
            </p>
          )}
        </div>
      )}

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
        {/* Sources Tab Content */}
        {activeTab === "sources" && (
          <>
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
          </>
        )}

        {/* Claims Tab Content */}
        {activeTab === "claims" && (
          <>
            {claimsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !claimsSummary || claimsSummary.claims.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p>No factual claims detected in this section</p>
                <p className="text-xs mt-1">Statistics, numbers, and dates are automatically checked</p>
              </div>
            ) : (
              <div className="divide-y">
                {claimsSummary.claims.map((claim) => {
                  const config = getClaimStatusConfig(claim.status, claim.riskLevel);
                  const StatusIcon = config.icon;
                  const isExpanded = expandedClaims.has(claim.id);

                  return (
                    <div
                      key={claim.id}
                      className={cn(
                        "",
                        claim.status === "UNVERIFIED" && claim.riskLevel === "HIGH" && "bg-red-50/50"
                      )}
                    >
                      <button
                        onClick={() => toggleClaimExpanded(claim.id)}
                        className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <StatusIcon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", config.color)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{claim.value}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={cn("text-[10px] py-0", config.bg, config.color)}>
                                {config.label}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] py-0">
                                <Hash className="h-2.5 w-2.5 mr-0.5" />
                                {getClaimTypeLabel(claim.type)}
                              </Badge>
                              {claim.riskLevel === "HIGH" && claim.status !== "VERIFIED" && (
                                <Badge variant="outline" className="text-[10px] py-0 text-red-600 border-red-200">
                                  High Risk
                                </Badge>
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
                          <p className="text-xs text-muted-foreground">
                            Context: "...{claim.context}..."
                          </p>
                          {claim.evidence ? (
                            <div className="p-2 rounded-md bg-muted/50 border">
                              <div className="flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium">{claim.evidence.documentName}</span>
                                <span className={cn("text-xs ml-auto", getSimilarityColor(claim.evidence.similarity))}>
                                  {Math.round(claim.evidence.similarity * 100)}% match
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1.5 italic">
                                "{claim.evidence.matchedText}"
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs mt-1.5 -ml-2"
                                onClick={() => onViewDocument(claim.evidence!.documentId, claim.evidence!.matchedText)}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View source
                              </Button>
                            </div>
                          ) : (
                            <div className="p-2 rounded-md bg-red-50 border border-red-200">
                              <p className="text-xs text-red-700">
                                No supporting evidence found in your knowledge base.
                              </p>
                              <p className="text-xs text-red-600 mt-1">
                                Upload a document containing this data or remove the claim.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
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
