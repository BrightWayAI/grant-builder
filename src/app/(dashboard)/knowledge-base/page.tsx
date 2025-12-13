import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { KnowledgeBaseManager } from "@/components/documents/knowledge-base-manager";
import { DocumentList } from "@/components/documents/document-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";
import { Progress } from "@/components/primitives/progress";
import { formatFileSize } from "@/lib/utils";
import { DOCUMENT_CATEGORIES } from "@/lib/document-categories";
import { BookOpen } from "lucide-react";
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

  const stats = {
    total: documents.length,
    indexed: documents.filter((d) => d.status === "INDEXED").length,
    processing: documents.filter((d) => d.status === "PROCESSING").length,
    failed: documents.filter((d) => d.status === "FAILED").length,
  };

  // Get existing document types
  const existingTypes = Array.from(new Set(documents.map((d) => d.documentType)));

  // Count documents by category
  const categoryDocCounts: Record<string, number> = {};
  DOCUMENT_CATEGORIES.forEach((cat) => {
    const typeValues = cat.types.map((t) => t.type);
    categoryDocCounts[cat.id] = documents.filter((d) => 
      typeValues.includes(d.documentType)
    ).length;
  });

  // Calculate knowledge base health score
  const healthScore = calculateHealthScore(existingTypes, stats.indexed);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title">Knowledge Base</h1>
        <p className="text-text-secondary">
          Upload documents to teach the AI about your organization and improve proposal generation
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${getHealthColor(healthScore)}`}>
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold font-display">{healthScore}%</div>
                <p className="text-sm text-text-secondary">Knowledge Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display">{stats.total}</div>
            <p className="text-sm text-text-secondary">Total Documents</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {stats.indexed > 0 && (
                <Badge variant="success" className="text-xs">{stats.indexed} ready</Badge>
              )}
              {stats.processing > 0 && (
                <Badge variant="default" className="text-xs">{stats.processing} processing</Badge>
              )}
              {stats.failed > 0 && (
                <Badge variant="error" className="text-xs">{stats.failed} failed</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display">{existingTypes.length}</div>
            <p className="text-sm text-text-secondary">Document Types</p>
            <Progress value={(existingTypes.length / 13) * 100} className="h-1 mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display">
              {formatFileSize(totalSize)}
            </div>
            <p className="text-sm text-text-secondary">
              of {formatFileSize(MAX_STORAGE_BYTES)} used
            </p>
            <Progress value={usagePercent} className="h-1 mt-3" />
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

function calculateHealthScore(existingTypes: DocumentType[], indexedCount: number): number {
  const highPriorityTypes: DocumentType[] = [
    "PROPOSAL", "ORG_OVERVIEW", "BOILERPLATE", "PROGRAM_DESCRIPTION", "IMPACT_REPORT"
  ];
  
  const hasHighPriority = highPriorityTypes.filter((t) => existingTypes.includes(t));
  const typeScore = (hasHighPriority.length / highPriorityTypes.length) * 60;
  const docScore = Math.min(indexedCount / 10, 1) * 40;
  
  return Math.round(typeScore + docScore);
}

function getHealthColor(score: number): string {
  if (score >= 70) return "bg-status-success/10 text-status-success";
  if (score >= 40) return "bg-status-warning/10 text-status-warning";
  return "bg-status-error/10 text-status-error";
}
