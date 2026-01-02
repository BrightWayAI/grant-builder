"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { Badge } from "@/components/primitives/badge";
import { Loader2 } from "lucide-react";

type ProposalStatus = "DRAFT" | "IN_PROGRESS" | "SUBMITTED" | "WON" | "LOST" | "ARCHIVED";

const STATUS_CONFIG: Record<ProposalStatus, { 
  label: string; 
  variant: "default" | "success" | "error" | "warning";
  description: string;
}> = {
  DRAFT: { label: "Draft", variant: "default", description: "Initial draft, not started" },
  IN_PROGRESS: { label: "In Progress", variant: "warning", description: "Actively being written" },
  SUBMITTED: { label: "Submitted", variant: "success", description: "Sent to funder" },
  WON: { label: "Won", variant: "success", description: "Grant awarded" },
  LOST: { label: "Lost", variant: "error", description: "Not funded" },
  ARCHIVED: { label: "Archived", variant: "default", description: "No longer active" },
};

interface ProposalStatusSelectProps {
  proposalId: string;
  currentStatus: ProposalStatus;
  onStatusChange?: (status: ProposalStatus) => void;
  compact?: boolean;
}

export function ProposalStatusSelect({ 
  proposalId, 
  currentStatus, 
  onStatusChange,
  compact = false,
}: ProposalStatusSelectProps) {
  const [status, setStatus] = useState<ProposalStatus>(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: ProposalStatus) => {
    if (newStatus === status) return;
    
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/proposals/${proposalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");
      
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    } catch (error) {
      console.error("Failed to update proposal status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const config = STATUS_CONFIG[status];

  if (compact) {
    return (
      <Select value={status} onValueChange={(v) => handleStatusChange(v as ProposalStatus)}>
        <SelectTrigger className="w-[140px] h-8">
          {isUpdating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <SelectValue>
              <Badge variant={config.variant} className="text-xs whitespace-nowrap">
                {config.label}
              </Badge>
            </SelectValue>
          )}
        </SelectTrigger>
        <SelectContent className="min-w-[160px]">
          {Object.entries(STATUS_CONFIG).map(([key, value]) => (
            <SelectItem key={key} value={key}>
              <div className="flex items-center gap-2">
                <Badge variant={value.variant} className="text-xs whitespace-nowrap">
                  {value.label}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select value={status} onValueChange={(v) => handleStatusChange(v as ProposalStatus)}>
      <SelectTrigger className="w-[160px]">
        {isUpdating ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Updating...</span>
          </div>
        ) : (
          <SelectValue>
            <div className="flex items-center gap-2">
              <Badge variant={config.variant}>{config.label}</Badge>
            </div>
          </SelectValue>
        )}
      </SelectTrigger>
      <SelectContent>
        {Object.entries(STATUS_CONFIG).map(([key, value]) => (
          <SelectItem key={key} value={key}>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <Badge variant={value.variant}>{value.label}</Badge>
              </div>
              <span className="text-xs text-text-tertiary mt-0.5">{value.description}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
