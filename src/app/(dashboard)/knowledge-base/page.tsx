import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { KnowledgeBaseManager } from "@/components/documents/knowledge-base-manager";
import { DocumentList } from "@/components/documents/document-list";
import { AddDocumentButton } from "@/components/documents/add-document-button";
import { KBHealthCard } from "@/components/knowledge-base/kb-health-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";
import { Progress } from "@/components/primitives/progress";
import { formatFileSize } from "@/lib/utils";
import { DOCUMENT_CATEGORIES } from "@/lib/document-categories";
import { CheckCircle2, Circle } from "lucide-react";
import { DocumentType } from "@prisma/client";

const MAX_STORAGE_BYTES = 500 * 1024 * 1024; // 500MB

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
  const usagePercent = Math.round((totalSize / MAX_STORAGE_BYTES) * 100);
  const avgSize = documents.length ? totalSize / documents.length : 0;
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

      {/* Stats Row */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Semantic KB Health Score */}
        <KBHealthCard />

        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold font-display">{existingTypes.length}</div>
                <p className="text-sm text-text-secondary">Document types</p>
              </div>
              <Badge variant="outline" className="text-[11px]">{stats.indexed} ready</Badge>
            </div>
            <Progress value={highValueProgress} className="h-1" />
            <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
              {HIGH_VALUE_GROUPS.map((group, idx) => (
                <div key={group.label} className="flex items-center gap-2">
                  {highValueProgressStates[idx] ? (
                    <CheckCircle2 className="h-4 w-4 text-status-success" />
                  ) : (
                    <Circle className="h-4 w-4 text-border" />
                  )}
                  <span>{group.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-2">
            <div className="text-2xl font-bold font-display">{formatFileSize(totalSize)}</div>
            <p className="text-sm text-text-secondary">of {formatFileSize(MAX_STORAGE_BYTES)} used</p>
            <Progress value={usagePercent} className="h-1" />
            <p className="text-xs text-text-secondary">Avg file: {formatFileSize(avgSize)}</p>
            {lastUpload && (
              <p className="text-xs text-text-secondary">Last upload: {new Date(lastUpload).toLocaleDateString()}</p>
            )}
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
