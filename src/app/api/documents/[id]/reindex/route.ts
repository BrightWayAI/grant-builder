import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import prisma from "@/lib/db";
import { getFileBuffer } from "@/lib/storage";
import { deleteDocumentIndex, indexDocument } from "@/lib/ai/embeddings";
import { DocumentType } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { organizationId } = await requireOrganization();

    const document = await prisma.document.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await prisma.document.update({
      where: { id: document.id },
      data: { status: "PROCESSING", errorMessage: null },
    });

    reindexDocumentAsync(document);

    return NextResponse.json({ success: true, message: "Reindexing started" });
  } catch (error) {
    console.error("Reindex error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to start reindex" }, { status: 500 });
  }
}

async function reindexDocumentAsync(document: {
  id: string;
  fileUrl: string;
  fileType: string;
  organizationId: string;
  documentType: DocumentType;
  filename: string;
  programArea: string | null;
}) {
  try {
    // Delete existing index
    await deleteDocumentIndex(document.id);

    // Get file from storage
    const urlObj = new URL(document.fileUrl);
    const key = urlObj.pathname.replace(/^\//, "");
    const buffer = await getFileBuffer(key);

    // Get mime type from file type
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      txt: "text/plain",
    };
    const mimeType = mimeTypes[document.fileType] || "text/plain";

    // Re-index with new processor
    await indexDocument(
      document.id,
      buffer,
      mimeType,
      document.filename,
      document.organizationId,
      document.documentType,
      document.programArea || undefined
    );
  } catch (error) {
    console.error("Reindex processing error:", error);
    await prisma.document.update({
      where: { id: document.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Reindex failed",
      },
    });
  }
}
