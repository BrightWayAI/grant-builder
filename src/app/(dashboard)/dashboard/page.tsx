import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { Button } from "@/components/primitives/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";
import { FileText, FolderOpen, Plus, ArrowRight, Compass, Sparkles } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { MatchingGrantsSection } from "@/components/dashboard/matching-grants";
import { KnowledgeScoreCard } from "@/components/dashboard/knowledge-score-card";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return null;

  const [documents, proposals, organization, savedGrantsCount] = await Promise.all([
    prisma.document.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.proposal.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.organization.findUnique({
      where: { id: user.organizationId },
    }),
    prisma.savedGrant.count({
      where: { organizationId: user.organizationId },
    }),
  ]);

  const documentCount = await prisma.document.count({
    where: { organizationId: user.organizationId },
  });

  const indexedCount = await prisma.document.count({
    where: { organizationId: user.organizationId, status: "INDEXED" },
  });

  const hasGrantCriteria = organization && (
    organization.programAreas.length > 0 || organization.orgType
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title">Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
          <p className="text-text-secondary">{organization?.name}</p>
        </div>
        <Link href="/proposals/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Proposal
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Grant Opportunities</CardTitle>
            <Compass className="h-5 w-5 text-text-tertiary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display">{savedGrantsCount}</div>
            <p className="text-sm text-text-secondary">saved to watchlist</p>
            <Link href="/discover" className="text-brand text-sm hover:underline mt-2 inline-flex items-center">
              Discover grants <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Proposals</CardTitle>
            <FileText className="h-5 w-5 text-text-tertiary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display">{proposals.length}</div>
            <p className="text-sm text-text-secondary">
              {proposals.filter((p) => p.status === "DRAFT").length} drafts,{" "}
              {proposals.filter((p) => p.status === "SUBMITTED").length} submitted
            </p>
            <Link href="/proposals" className="text-brand text-sm hover:underline mt-2 inline-flex items-center">
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </CardContent>
        </Card>

        <div className="h-full">
          <KnowledgeScoreCard />
        </div>
      </div>

      {/* Matching Grants Section */}
      {hasGrantCriteria ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-brand" />
                Recommended Grants
              </CardTitle>
              <CardDescription>
                Opportunities matching your organization&apos;s profile
              </CardDescription>
            </div>
            <Link href="/discover">
              <Button variant="secondary" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <MatchingGrantsSection />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Compass className="h-12 w-12 text-text-disabled mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Complete your profile to see matching grants</h3>
            <p className="text-text-secondary mb-4 max-w-md mx-auto">
              Add your program areas and organization type in settings to get personalized grant recommendations.
            </p>
            <Link href="/settings">
              <Button variant="secondary">Update Profile</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Setup Knowledge Base CTA */}
      {documentCount === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <FolderOpen className="h-12 w-12 text-text-disabled mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Set up your Knowledge Base</h3>
            <p className="text-text-secondary mb-4 max-w-md mx-auto">
              Upload past proposals, annual reports, and other documents to train the AI on your organization&apos;s voice and data.
            </p>
            <Link href="/knowledge-base">
              <Button>Upload Documents</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Recent Proposals */}
      {proposals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Proposals</CardTitle>
            <CardDescription>Your latest grant proposal drafts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {proposals.map((proposal) => (
                <Link
                  key={proposal.id}
                  href={`/proposals/${proposal.id}/edit`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-brand hover:bg-surface-hover transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-surface-muted flex items-center justify-center group-hover:bg-brand/10 transition-colors">
                      <FileText className="h-4 w-4 text-text-tertiary group-hover:text-brand transition-colors" />
                    </div>
                    <div>
                      <div className="font-medium text-text-primary group-hover:text-brand transition-colors">{proposal.title}</div>
                      <div className="text-sm text-text-secondary">
                        {proposal.funderName && `${proposal.funderName} • `}
                        Last edited {formatDate(proposal.updatedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={proposal.status === "DRAFT" ? "default" : "success"}>
                      {proposal.status.toLowerCase()}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Documents */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Documents</CardTitle>
            <CardDescription>Latest uploads to your knowledge base</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-text-tertiary" />
                    <div>
                      <div className="text-sm font-medium text-text-primary">{doc.filename}</div>
                      <div className="text-xs text-text-secondary">{doc.documentType.replace("_", " ")}</div>
                    </div>
                  </div>
                  <Badge
                    variant={
                      doc.status === "INDEXED" ? "success" : doc.status === "FAILED" ? "error" : "default"
                    }
                  >
                    {doc.status.toLowerCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
