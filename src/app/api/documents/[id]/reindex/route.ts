import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import prisma from "@/lib/db";
import { getFileBuffer } from "@/lib/storage";
import { extractTextFromFile } from "@/lib/ai/document-parser";
import { deleteDocumentIndex, indexDocument } from "@/lib/ai/embeddings";

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
  documentType: string;
  filename: string;
  programArea: string | null;
}) {
  try {
    await deleteDocumentIndex(document.id);

    const urlObj = new URL(document.fileUrl);
    const key = urlObj.pathname.replace(/^\//, "");
    const buffer = await getFileBuffer(key);

    const text = await extractTextFromFile(buffer, document.fileType);
    
    await indexDocument(
      document.id,
      text,
      document.organizationId,
      document.documentType as import("@prisma/client").DocumentType,
      document.filename,
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
