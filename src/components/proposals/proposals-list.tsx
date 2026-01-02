"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { Progress } from "@/components/primitives/progress";
import { ProposalStatusSelect } from "./proposal-status-select";
import { DeadlineBadge } from "./deadline-badge";
import { FileText, DollarSign, Search, SortAsc, Filter } from "lucide-react";
import { formatDate } from "@/lib/utils";

type ProposalStatus = "DRAFT" | "IN_PROGRESS" | "SUBMITTED" | "WON" | "LOST" | "ARCHIVED";

interface Section {
  id: string;
  content: string;
  wordLimit: number | null;
  isRequired: boolean;
}

interface Proposal {
  id: string;
  title: string;
  funderName: string | null;
  programTitle: string | null;
  deadline: string | null;
  fundingAmountMin: number | null;
  fundingAmountMax: number | null;
  status: ProposalStatus;
  updatedAt: string;
  sections: Section[];
}

interface ProposalsListProps {
  initialProposals: Proposal[];
}

type SortOption = "updated" | "deadline" | "title" | "funding";
type FilterStatus = "all" | ProposalStatus;

function countWords(text: string): number {
  if (!text) return 0;
  const stripped = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!stripped) return 0;
  return stripped.split(" ").filter(Boolean).length;
}

function getCompletionPercent(sections: Section[]): number {
  if (sections.length === 0) return 0;
  const completed = sections.filter(s => countWords(s.content) > 50).length;
  return Math.round((completed / sections.length) * 100);
}

export function ProposalsList({ initialProposals }: ProposalsListProps) {
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [sortBy, setSortBy] = useState<SortOption>("updated");

  const filteredAndSorted = useMemo(() => {
    let result = [...proposals];

    // Filter by search
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(lower) ||
        p.funderName?.toLowerCase().includes(lower) ||
        p.programTitle?.toLowerCase().includes(lower)
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter(p => p.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "deadline":
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case "title":
          return a.title.localeCompare(b.title);
        case "funding":
          const aMax = a.fundingAmountMax || a.fundingAmountMin || 0;
          const bMax = b.fundingAmountMax || b.fundingAmountMin || 0;
          return bMax - aMax;
        case "updated":
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return result;
  }, [proposals, search, statusFilter, sortBy]);

  const handleStatusChange = (proposalId: string, newStatus: ProposalStatus) => {
    setProposals(prev => 
      prev.map(p => p.id === proposalId ? { ...p, status: newStatus } : p)
    );
  };

  // Group counts for filter badges
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: proposals.length };
    proposals.forEach(p => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, [proposals]);

  return (
    <div className="space-y-4">
      {/* Filters & Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            placeholder="Search proposals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2 text-text-tertiary" />
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({statusCounts.all})</SelectItem>
            <SelectItem value="DRAFT">Draft ({statusCounts.DRAFT || 0})</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress ({statusCounts.IN_PROGRESS || 0})</SelectItem>
            <SelectItem value="SUBMITTED">Submitted ({statusCounts.SUBMITTED || 0})</SelectItem>
            <SelectItem value="WON">Won ({statusCounts.WON || 0})</SelectItem>
            <SelectItem value="LOST">Lost ({statusCounts.LOST || 0})</SelectItem>
            <SelectItem value="ARCHIVED">Archived ({statusCounts.ARCHIVED || 0})</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[160px]">
            <SortAsc className="h-4 w-4 mr-2 text-text-tertiary" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Last Updated</SelectItem>
            <SelectItem value="deadline">Deadline</SelectItem>
            <SelectItem value="title">Title</SelectItem>
            <SelectItem value="funding">Funding Amount</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      {(search || statusFilter !== "all") && (
        <p className="text-sm text-text-secondary">
          Showing {filteredAndSorted.length} of {proposals.length} proposals
          {search && ` matching "${search}"`}
        </p>
      )}

      {/* Proposals List */}
      <div className="grid gap-4">
        {filteredAndSorted.map((proposal) => {
          const completionPercent = getCompletionPercent(proposal.sections);
          const completedSections = proposal.sections.filter(s => countWords(s.content) > 50).length;

          return (
            <Link key={proposal.id} href={`/proposals/${proposal.id}/edit`}>
              <Card variant="interactive">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">{proposal.title}</CardTitle>
                      <CardDescription className="truncate">
                        {proposal.funderName && `${proposal.funderName}`}
                        {proposal.programTitle && ` - ${proposal.programTitle}`}
                      </CardDescription>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ProposalStatusSelect
                        proposalId={proposal.id}
                        currentStatus={proposal.status}
                        onStatusChange={(status) => handleStatusChange(proposal.id, status)}
                        compact
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-text-secondary">
                    {proposal.deadline && (
                      <DeadlineBadge deadline={proposal.deadline} />
                    )}
                    {(proposal.fundingAmountMin || proposal.fundingAmountMax) && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        <span>
                          {proposal.fundingAmountMax
                            ? `$${proposal.fundingAmountMax.toLocaleString()}`
                            : `$${proposal.fundingAmountMin?.toLocaleString()}`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>{completedSections}/{proposal.sections.length} sections</span>
                      <Progress value={completionPercent} className="h-1.5 w-12" />
                    </div>
                    <span className="ml-auto text-text-tertiary">
                      {formatDate(proposal.updatedAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {filteredAndSorted.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <FileText className="h-8 w-8 text-text-disabled mx-auto mb-2" />
              <p className="text-text-secondary">
                {search || statusFilter !== "all"
                  ? "No proposals match your filters"
                  : "No proposals yet"}
              </p>
              {(search || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
