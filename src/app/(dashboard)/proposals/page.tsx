import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { Button } from "@/components/primitives/button";
import { Card, CardContent } from "@/components/primitives/card";
import { ProposalsList } from "@/components/proposals/proposals-list";
import { Plus, FileText } from "lucide-react";

export default async function ProposalsPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return null;

  const proposals = await prisma.proposal.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { updatedAt: "desc" },
    include: {
      sections: {
        select: { 
          id: true, 
          content: true,
          wordLimit: true,
          isRequired: true,
        },
      },
    },
  });

  // Transform for client component
  const proposalsData = proposals.map(p => ({
    id: p.id,
    title: p.title,
    funderName: p.funderName,
    programTitle: p.programTitle,
    deadline: p.deadline?.toISOString() || null,
    fundingAmountMin: p.fundingAmountMin,
    fundingAmountMax: p.fundingAmountMax,
    status: p.status,
    updatedAt: p.updatedAt.toISOString(),
    sections: p.sections,
  }));

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
        <ProposalsList initialProposals={proposalsData} />
      )}
    </div>
  );
}
