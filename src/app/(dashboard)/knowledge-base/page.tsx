import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { DocumentUpload } from "@/components/documents/document-upload";
import { DocumentList } from "@/components/documents/document-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";
import { Progress } from "@/components/primitives/progress";
import { formatFileSize } from "@/lib/utils";
import { 
  DOCUMENT_CATEGORIES, 
  getMissingRecommendedTypes, 
  getDocumentTypeInfo 
} from "@/lib/document-categories";
import { 
  FileText, 
  Building2, 
  Target, 
  TrendingUp, 
  DollarSign, 
  Folder,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  BookOpen,
} from "lucide-react";
import { DocumentType } from "@prisma/client";

const MAX_STORAGE_BYTES = 500 * 1024 * 1024; // 500MB

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  FileText,
  Building2,
  Target,
  TrendingUp,
  DollarSign,
  Folder,
};

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

  // Analyze what types the user has
  const existingTypes = Array.from(new Set(documents.map((d) => d.documentType)));
  const missingRecommended = getMissingRecommendedTypes(existingTypes);

  // Count documents by category
  const countByCategory = DOCUMENT_CATEGORIES.map((cat) => {
    const typeValues = cat.types.map((t) => t.type);
    const count = documents.filter((d) => typeValues.includes(d.documentType)).length;
    return { ...cat, count };
  });

  // Calculate knowledge base "health" score
  const healthScore = calculateHealthScore(existingTypes, stats.indexed);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title">Knowledge Base</h1>
        <p className="text-text-secondary">
          Upload documents to teach the AI about your organization and improve proposal generation
        </p>
      </div>

      {/* Health Score & Stats */}
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
            <div className="flex gap-2 mt-2">
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

      {/* Recommendations */}
      {missingRecommended.length > 0 && (
        <Card className="border-brand/20 bg-brand-light">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-brand" />
              <CardTitle className="text-base">Recommended Documents</CardTitle>
            </div>
            <CardDescription>
              Upload these high-priority document types to improve proposal generation quality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {missingRecommended.slice(0, 5).map((type) => (
                <div
                  key={type.type}
                  className="flex items-center gap-2 bg-white/80 rounded-lg px-3 py-2 text-sm"
                >
                  <AlertCircle className="h-4 w-4 text-status-warning" />
                  <span className="font-medium">{type.label}</span>
                  <span className="text-text-tertiary">- {type.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Categories Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Document Categories</CardTitle>
          <CardDescription>
            Your knowledge base organized by type. High-priority categories are used more heavily in proposal generation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {countByCategory.map((category) => {
              const IconComponent = CATEGORY_ICONS[category.icon] || Folder;
              const hasHighPriority = category.types.some((t) => t.ragPriority === "high");
              
              return (
                <div
                  key={category.id}
                  className="flex items-start gap-3 p-4 rounded-lg border border-border"
                >
                  <div className={`p-2 rounded-lg ${category.count > 0 ? "bg-status-success/10" : "bg-surface-secondary"}`}>
                    <IconComponent className={`h-5 w-5 ${category.count > 0 ? "text-status-success" : "text-text-tertiary"}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">{category.name}</span>
                      {hasHighPriority && (
                        <Badge variant="outline" className="text-xs">High Priority</Badge>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary mt-0.5">
                      {category.count} document{category.count !== 1 ? "s" : ""}
                    </p>
                    {category.count === 0 && (
                      <p className="text-xs text-text-tertiary mt-1">
                        {category.types.map((t) => t.label).join(", ")}
                      </p>
                    )}
                  </div>
                  {category.count > 0 && (
                    <CheckCircle2 className="h-5 w-5 text-status-success" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <CardDescription>
            Add documents to your knowledge base. The AI will learn from these to generate better proposals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentUpload organizationId={user.organizationId} />
        </CardContent>
      </Card>

      {/* Document List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Documents</CardTitle>
          <CardDescription>
            {documents.length === 0
              ? "Upload documents above to get started"
              : `${stats.indexed} documents indexed and ready for proposal generation`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentList documents={docsWithChunks} />
        </CardContent>
      </Card>
    </div>
  );
}

function calculateHealthScore(existingTypes: DocumentType[], indexedCount: number): number {
  // Score based on:
  // 1. Having key document types (60%)
  // 2. Number of indexed documents (40%)
  
  const highPriorityTypes: DocumentType[] = [
    "PROPOSAL", "ORG_OVERVIEW", "BOILERPLATE", "PROGRAM_DESCRIPTION", "IMPACT_REPORT"
  ];
  
  const hasHighPriority = highPriorityTypes.filter((t) => existingTypes.includes(t));
  const typeScore = (hasHighPriority.length / highPriorityTypes.length) * 60;
  
  // Indexed document score (caps at 10 docs)
  const docScore = Math.min(indexedCount / 10, 1) * 40;
  
  return Math.round(typeScore + docScore);
}

function getHealthColor(score: number): string {
  if (score >= 70) return "bg-status-success/10 text-status-success";
  if (score >= 40) return "bg-status-warning/10 text-status-warning";
  return "bg-status-error/10 text-status-error";
}
