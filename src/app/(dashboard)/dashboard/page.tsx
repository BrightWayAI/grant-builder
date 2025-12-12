import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, FolderOpen, Plus, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return null;

  const [documents, proposals, organization] = await Promise.all([
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
  ]);

  const documentCount = await prisma.document.count({
    where: { organizationId: user.organizationId },
  });

  const indexedCount = await prisma.document.count({
    where: { organizationId: user.organizationId, status: "INDEXED" },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
          <p className="text-gray-600">{organization?.name}</p>
        </div>
        <Link href="/proposals/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Proposal
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Knowledge Base</CardTitle>
            <FolderOpen className="h-5 w-5 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{documentCount}</div>
            <p className="text-sm text-gray-500">
              {indexedCount} indexed, {documentCount - indexedCount} processing
            </p>
            <Link href="/knowledge-base" className="text-primary text-sm hover:underline mt-2 inline-flex items-center">
              Manage documents <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Proposals</CardTitle>
            <FileText className="h-5 w-5 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{proposals.length}</div>
            <p className="text-sm text-gray-500">
              {proposals.filter((p) => p.status === "DRAFT").length} drafts,{" "}
              {proposals.filter((p) => p.status === "SUBMITTED").length} submitted
            </p>
            <Link href="/proposals" className="text-primary text-sm hover:underline mt-2 inline-flex items-center">
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {documentCount === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Set up your Knowledge Base</h3>
            <p className="text-gray-500 mb-4 max-w-md mx-auto">
              Upload past proposals, annual reports, and other documents to train the AI on your organization&apos;s voice and data.
            </p>
            <Link href="/knowledge-base">
              <Button>Upload Documents</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {proposals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Proposals</CardTitle>
            <CardDescription>Your latest grant proposal drafts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {proposals.map((proposal) => (
                <Link
                  key={proposal.id}
                  href={`/proposals/${proposal.id}/edit`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <div className="font-medium">{proposal.title}</div>
                    <div className="text-sm text-gray-500">
                      {proposal.funderName && `${proposal.funderName} • `}
                      Last edited {formatDate(proposal.updatedAt)}
                    </div>
                  </div>
                  <Badge variant={proposal.status === "DRAFT" ? "secondary" : "success"}>
                    {proposal.status.toLowerCase()}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                    <FileText className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium">{doc.filename}</div>
                      <div className="text-xs text-gray-500">{doc.documentType.replace("_", " ")}</div>
                    </div>
                  </div>
                  <Badge
                    variant={
                      doc.status === "INDEXED" ? "success" : doc.status === "FAILED" ? "destructive" : "secondary"
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
