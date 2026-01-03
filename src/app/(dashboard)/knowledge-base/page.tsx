import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { KnowledgeBaseManager } from "@/components/documents/knowledge-base-manager";
import { DocumentList } from "@/components/documents/document-list";
import { AddDocumentButton } from "@/components/documents/add-document-button";
import { KBHealthCard } from "@/components/knowledge-base/kb-health-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";
import { formatFileSize } from "@/lib/utils";
import { DOCUMENT_CATEGORIES } from "@/lib/document-categories";
import { Circle } from "lucide-react";
import { DocumentType } from "@prisma/client";

export default async function KnowledgeBasePage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return null;

  const documents = await prisma.document.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { chunks: true },
      },
    },
  });

  const docsWithChunks = documents.map((doc) => ({
    ...doc,
    chunkCount: doc._count.chunks,
  }));

  const totalSize = documents.reduce((sum, doc) => sum + doc.fileSize, 0);
  const lastUpload = documents.length ? documents[0].createdAt : null;

  const stats = {
    total: documents.length,
    indexed: documents.filter((d) => d.status === "INDEXED").length,
    processing: documents.filter((d) => d.status === "PROCESSING").length,
    failed: documents.filter((d) => d.status === "FAILED").length,
  };

  // Get existing document types
  const existingTypes = Array.from(new Set(documents.map((d) => d.documentType)));
  const highValueProgressStates = HIGH_VALUE_GROUPS.map((group) =>
    group.types.some((t) => existingTypes.includes(t))
  );
  const highValueProgress = (highValueProgressStates.filter(Boolean).length / HIGH_VALUE_GROUPS.length) * 100;

  // Count documents by category
  const categoryDocCounts: Record<string, number> = {};
  DOCUMENT_CATEGORIES.forEach((cat) => {
    const typeValues = cat.types.map((t) => t.type);
    categoryDocCounts[cat.id] = documents.filter((d) => 
      typeValues.includes(d.documentType)
    ).length;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-title">Knowledge Base</h1>
          <p className="text-text-secondary">
            Upload documents to teach the AI about your organization and improve proposal generation
          </p>
        </div>
        <AddDocumentButton organizationId={user.organizationId} />
      </div>

      {/* Stats Row - 2 Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Beacon Readiness Index */}
        <KBHealthCard />

        {/* Documents Card */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold font-display">{stats.total}</div>
                <p className="text-sm text-text-secondary">documents uploaded</p>
              </div>
              <div className="text-right">
                <Badge variant={stats.indexed === stats.total ? "success" : "outline"} className="text-[11px]">
                  {stats.indexed} indexed
                </Badge>
                {stats.processing > 0 && (
                  <p className="text-xs text-text-tertiary mt-1">{stats.processing} processing</p>
                )}
              </div>
            </div>
            
            {/* Missing high-value types */}
            {HIGH_VALUE_GROUPS.filter((_, idx) => !highValueProgressStates[idx]).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-text-tertiary">Recommended to add:</p>
                <div className="flex flex-wrap gap-1.5">
                  {HIGH_VALUE_GROUPS.filter((_, idx) => !highValueProgressStates[idx]).map((group) => (
                    <span 
                      key={group.label}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-yellow-50 border border-yellow-200 text-yellow-700"
                    >
                      <Circle className="h-3 w-3" />
                      {group.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Storage & last upload */}
            <div className="flex items-center justify-between text-xs text-text-tertiary pt-2 border-t">
              <span>{formatFileSize(totalSize)} used</span>
              {lastUpload && (
                <span>Last upload: {new Date(lastUpload).toLocaleDateString()}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Combined Categories & Upload Manager */}
      <KnowledgeBaseManager 
        organizationId={user.organizationId}
        existingTypes={existingTypes}
        categoryDocCounts={categoryDocCounts}
      />

      {/* Document List */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Documents</CardTitle>
            <CardDescription>
              {stats.indexed} documents indexed and ready for proposal generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentList documents={docsWithChunks} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const HIGH_VALUE_GROUPS: { label: string; types: DocumentType[] }[] = [
  { label: "Proposals/RFPs", types: ["PROPOSAL"] },
  { label: "Org overview", types: ["ORG_OVERVIEW"] },
  { label: "Program description", types: ["PROGRAM_DESCRIPTION"] },
  { label: "Impact report", types: ["IMPACT_REPORT"] },
  { label: "Logic model", types: ["LOGIC_MODEL"] },
  { label: "Financials (audit/990)", types: ["AUDITED_FINANCIALS", "FORM_990"] },
];
