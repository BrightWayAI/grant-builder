import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { Button } from "@/components/primitives/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";
import { Plus, FileText, Calendar, DollarSign } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ProposalStatus } from "@prisma/client";

const STATUS_CONFIG: Record<ProposalStatus, { label: string; variant: "default" | "success" | "error" | "warning" }> = {
  DRAFT: { label: "Draft", variant: "default" },
  IN_PROGRESS: { label: "In Progress", variant: "warning" },
  SUBMITTED: { label: "Submitted", variant: "success" },
  WON: { label: "Won", variant: "success" },
  LOST: { label: "Lost", variant: "error" },
  ARCHIVED: { label: "Archived", variant: "default" },
};

export default async function ProposalsPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return null;

  const proposals = await prisma.proposal.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { updatedAt: "desc" },
    include: {
      sections: {
        select: { id: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title">Proposals</h1>
          <p className="text-text-secondary">Manage your grant proposal drafts</p>
        </div>
        <Link href="/proposals/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Proposal
          </Button>
        </Link>
      </div>

      {proposals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-text-disabled mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No proposals yet</h3>
            <p className="text-text-secondary mb-4 max-w-md mx-auto">
              Create your first proposal by uploading an RFP. We&apos;ll extract the requirements and generate a draft.
            </p>
            <Link href="/proposals/new">
              <Button>Create Your First Proposal</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {proposals.map((proposal) => {
            const statusConfig = STATUS_CONFIG[proposal.status];
            return (
              <Link key={proposal.id} href={`/proposals/${proposal.id}/edit`}>
                <Card variant="interactive">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{proposal.title}</CardTitle>
                        <CardDescription>
                          {proposal.funderName && `${proposal.funderName}`}
                          {proposal.programTitle && ` - ${proposal.programTitle}`}
                        </CardDescription>
                      </div>
                      <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6 text-sm text-text-secondary">
                      {proposal.deadline && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Due {formatDate(proposal.deadline)}</span>
                        </div>
                      )}
                      {(proposal.fundingAmountMin || proposal.fundingAmountMax) && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span>
                            {proposal.fundingAmountMax
                              ? `Up to $${proposal.fundingAmountMax.toLocaleString()}`
                              : `$${proposal.fundingAmountMin?.toLocaleString()}`}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>{proposal.sections.length} sections</span>
                      </div>
                      <div className="ml-auto">
                        Last edited {formatDate(proposal.updatedAt)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
