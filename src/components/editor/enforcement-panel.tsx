"use client";

/**
 * Enforcement Panel Component (AC-1.4, AC-4.1, AC-4.3, AC-5.2)
 * 
 * Displays real-time compliance and enforcement status in the editor sidebar:
 * - Section coverage scores with confidence levels
 * - Live compliance issues (blocking and warnings)
 * - Checklist completion status
 * - Voice profile score
 * - Generic knowledge warnings
 */

import { useState, useEffect, useCallback } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Shield,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComplianceStatus, ComplianceIssue, SectionComplianceStatus } from "@/app/api/proposals/[id]/compliance/route";

interface EnforcementPanelProps {
  proposalId: string;
  onSectionClick?: (sectionId: string) => void;
}

// Polling interval for compliance updates (20 seconds)
const POLL_INTERVAL = 20000;

// User-friendly confidence labels and tooltips
function getConfidenceLabel(level: string): string {
  switch (level) {
    case "HIGH": return "Strong";
    case "MEDIUM": return "Moderate";
    case "LOW": return "Weak";
    case "CRITICAL": return "Very Weak";
    default: return "Unknown";
  }
}

function getConfidenceTooltip(level: string): string {
  switch (level) {
    case "HIGH": 
      return "Strong match (60%+): This content closely matches your uploaded documents.";
    case "MEDIUM": 
      return "Moderate match (40-59%): Some content matches your documents, but portions may need verification.";
    case "LOW": 
      return "Weak match (25-39%): Limited connection to your uploaded documents. Consider adding more source materials.";
    case "CRITICAL": 
      return "Very weak match (<25%): Most content is not supported by your documents. Upload relevant documents to improve.";
    default: 
      return "Source matching has not been calculated yet.";
  }
}

export function EnforcementPanel({ proposalId, onSectionClick }: EnforcementPanelProps) {
  const [status, setStatus] = useState<ComplianceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchComplianceStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/proposals/${proposalId}/compliance`);
      if (!response.ok) {
        throw new Error("Failed to fetch compliance status");
      }
      const data = await response.json();
      setStatus(data);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    fetchComplianceStatus();
    const interval = setInterval(fetchComplianceStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchComplianceStatus]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case "HIGH":
        return "text-green-600 bg-green-50";
      case "MEDIUM":
        return "text-yellow-600 bg-yellow-50";
      case "LOW":
        return "text-orange-600 bg-orange-50";
      case "CRITICAL":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getConfidenceIcon = (level: string) => {
    switch (level) {
      case "HIGH":
        return <ShieldCheck className="h-4 w-4" />;
      case "MEDIUM":
        return <Shield className="h-4 w-4" />;
      case "LOW":
      case "CRITICAL":
        return <ShieldAlert className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  if (loading && !status) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
        Loading compliance status...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-sm text-red-600">
        <AlertCircle className="h-4 w-4 mx-auto mb-2" />
        {error}
      </div>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <div className="border-l bg-muted/30 w-80 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Enforcement Status</h3>
          <button
            onClick={() => fetchComplianceStatus()}
            className="p-1 hover:bg-muted rounded"
            title="Refresh"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          </button>
        </div>
        
        {/* Overall Status */}
        <div className={cn(
          "flex items-center gap-2 p-2 rounded-md",
          status.canExport ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        )}>
          {status.canExport ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">Ready for Export</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {status.blockingIssues.length} Blocking Issue{status.blockingIssues.length !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Overall Confidence Score (AC-4.3) */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Source Confidence
          </div>
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-lg",
            getConfidenceColor(status.overallConfidence)
          )}>
            {getConfidenceIcon(status.overallConfidence)}
            <div className="flex-1">
              <div className="font-semibold">{status.overallScore}%</div>
              <div className="text-xs opacity-80">{status.overallConfidence} Confidence</div>
            </div>
          </div>
        </div>

        {/* Blocking Issues */}
        {status.blockingIssues.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-red-600 uppercase tracking-wide">
              Must Fix Before Export
            </div>
            <div className="space-y-1">
              {status.blockingIssues.map((issue, idx) => (
                <IssueItem
                  key={idx}
                  issue={issue}
                  severity="error"
                  onClick={() => issue.sectionId && onSectionClick?.(issue.sectionId)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {status.warningIssues.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-yellow-600 uppercase tracking-wide">
              Warnings
            </div>
            <div className="space-y-1">
              {status.warningIssues.map((issue, idx) => (
                <IssueItem
                  key={idx}
                  issue={issue}
                  severity="warning"
                  onClick={() => issue.sectionId && onSectionClick?.(issue.sectionId)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Section Details (AC-1.4) */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Section Coverage
          </div>
          <div className="space-y-1">
            {status.sections.map(section => (
              <SectionStatusItem
                key={section.id}
                section={section}
                expanded={expandedSections.has(section.id)}
                onToggle={() => toggleSection(section.id)}
                onClick={() => onSectionClick?.(section.id)}
              />
            ))}
          </div>
        </div>

        {/* Checklist Status (AC-2.2) */}
        {status.checklistStatus.total > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Checklist Progress
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {status.checklistStatus.complete}/{status.checklistStatus.total} Complete
                </span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded",
                  status.checklistStatus.incomplete.length === 0
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                )}>
                  {Math.round((status.checklistStatus.complete / status.checklistStatus.total) * 100)}%
                </span>
              </div>
              {status.checklistStatus.incomplete.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Missing: {status.checklistStatus.incomplete.slice(0, 3).join(", ")}
                  {status.checklistStatus.incomplete.length > 3 && ` +${status.checklistStatus.incomplete.length - 3} more`}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enforcement Failure Warning (AC-5.3) */}
        {status.enforcementFailure && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-red-800">
                  Enforcement Failure
                </div>
                <div className="text-xs text-red-600 mt-1">
                  Validation could not complete. Export is blocked until this is resolved.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Updated {lastRefresh.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

function IssueItem({
  issue,
  severity,
  onClick,
}: {
  issue: ComplianceIssue;
  severity: "error" | "warning";
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-2 rounded-md text-sm flex items-start gap-2 transition-colors",
        severity === "error"
          ? "bg-red-50 hover:bg-red-100 text-red-800"
          : "bg-yellow-50 hover:bg-yellow-100 text-yellow-800"
      )}
    >
      {severity === "error" ? (
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
      ) : (
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
      )}
      <div className="min-w-0">
        <div className="font-medium truncate">{issue.sectionName || issue.type}</div>
        <div className="text-xs opacity-80 line-clamp-2">{issue.message}</div>
      </div>
    </button>
  );
}

function SectionStatusItem({
  section,
  expanded,
  onToggle,
  onClick,
}: {
  section: SectionComplianceStatus;
  expanded: boolean;
  onToggle: () => void;
  onClick: () => void;
}) {
  const hasIssues = section.issues.length > 0;
  
  return (
    <div className="border rounded-md overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        )}
        <FileText className="h-3 w-3 text-muted-foreground" />
        <span className="flex-1 text-left text-sm truncate">{section.name}</span>
        
        {/* Coverage Badge */}
        {section.coverageScore !== null && (
          <span 
            className={cn(
              "text-xs px-1.5 py-0.5 rounded font-medium cursor-help",
              section.coverageScore >= 60
                ? "bg-green-100 text-green-700"
                : section.coverageScore >= 40
                ? "bg-yellow-100 text-yellow-700"
                : section.coverageScore >= 25
                ? "bg-orange-100 text-orange-700"
                : "bg-red-100 text-red-700"
            )}
            title={`${section.coverageScore}% of this section matches your uploaded documents`}
          >
            {section.coverageScore}%
          </span>
        )}
        
        {/* Issue Indicator */}
        {hasIssues && (
          <span className={cn(
            "w-2 h-2 rounded-full",
            section.issues.some(i => i.severity === "ERROR")
              ? "bg-red-500"
              : "bg-yellow-500"
          )} />
        )}
        
        {/* Generic Knowledge Warning (AC-4.4) */}
        {section.usedGenericKnowledge && (
          <span
            className="text-orange-500"
            title="Generated without supporting sources"
          >
            <AlertTriangle className="h-3 w-3" />
          </span>
        )}
      </button>
      
      {expanded && (
        <div className="border-t bg-muted/20 p-2 space-y-2">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-background rounded p-1.5">
              <div className="text-muted-foreground">Words</div>
              <div className="font-medium">
                {section.wordCount}
                {section.wordLimit && (
                  <span className="text-muted-foreground">/{section.wordLimit}</span>
                )}
              </div>
            </div>
            <div 
              className="bg-background rounded p-1.5 cursor-help"
              title={getConfidenceTooltip(section.confidenceLevel)}
            >
              <div className="text-muted-foreground">Source Match</div>
              <div className={cn(
                "font-medium",
                section.confidenceLevel === "HIGH" && "text-green-600",
                section.confidenceLevel === "MEDIUM" && "text-yellow-600",
                section.confidenceLevel === "LOW" && "text-orange-600",
                section.confidenceLevel === "CRITICAL" && "text-red-600"
              )}>
                {getConfidenceLabel(section.confidenceLevel)}
              </div>
            </div>
          </div>
          
          {/* Placeholders */}
          {section.placeholderCount > 0 && (
            <div className="text-xs bg-yellow-50 text-yellow-700 rounded p-1.5">
              {section.placeholderCount} unresolved placeholder(s)
            </div>
          )}
          
          {/* Generic Knowledge Warning */}
          {section.usedGenericKnowledge && (
            <div className="text-xs bg-orange-50 text-orange-700 rounded p-1.5">
              Generated without supporting sources from knowledge base
            </div>
          )}
          
          {/* Issues */}
          {section.issues.length > 0 && (
            <div className="space-y-1">
              {section.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "text-xs p-1.5 rounded",
                    issue.severity === "ERROR"
                      ? "bg-red-50 text-red-700"
                      : "bg-yellow-50 text-yellow-700"
                  )}
                >
                  {issue.message}
                </div>
              ))}
            </div>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="text-xs text-primary hover:underline"
          >
            Go to section
          </button>
        </div>
      )}
    </div>
  );
}
