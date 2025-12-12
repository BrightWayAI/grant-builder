import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { DocumentUpload } from "@/components/documents/document-upload";
import { DocumentList } from "@/components/documents/document-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFileSize } from "@/lib/utils";

const MAX_STORAGE_BYTES = 500 * 1024 * 1024; // 500MB

export default async function KnowledgeBasePage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return null;

  const documents = await prisma.document.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
  });

  const totalSize = documents.reduce((sum, doc) => sum + doc.fileSize, 0);
  const usagePercent = Math.round((totalSize / MAX_STORAGE_BYTES) * 100);

  const stats = {
    total: documents.length,
    indexed: documents.filter((d) => d.status === "INDEXED").length,
    processing: documents.filter((d) => d.status === "PROCESSING").length,
    failed: documents.filter((d) => d.status === "FAILED").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Knowledge Base</h1>
        <p className="text-gray-600">
          Upload documents to teach the AI about your organization
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-gray-500">Total Documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.indexed}</div>
            <p className="text-sm text-gray-500">Indexed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.processing}</div>
            <p className="text-sm text-gray-500">Processing</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatFileSize(totalSize)} / {formatFileSize(MAX_STORAGE_BYTES)}
            </div>
            <p className="text-sm text-gray-500">Storage Used ({usagePercent}%)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <CardDescription>
            Supported formats: PDF, DOCX, TXT. Maximum file size: 50MB per file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentUpload organizationId={user.organizationId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Documents</CardTitle>
          <CardDescription>
            {documents.length === 0
              ? "No documents uploaded yet"
              : `${stats.indexed} documents ready for use in proposal generation`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentList documents={documents} />
        </CardContent>
      </Card>
    </div>
  );
}
