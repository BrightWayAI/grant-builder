import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import prisma from "@/lib/db";
import { uploadFile } from "@/lib/storage";
import { isValidFileType, getFileTypeFromMime } from "@/lib/ai/document-processor";
import { indexDocument } from "@/lib/ai/embeddings";
import { DocumentType } from "@prisma/client";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await requireOrganization();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentType = formData.get("documentType") as string;
    const programArea = formData.get("programArea") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!isValidFileType(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported: PDF, DOCX, TXT" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to storage
    const { url } = await uploadFile(
      buffer,
      file.name,
      file.type,
      organizationId,
      "documents"
    );

    // Create document record
    const document = await prisma.document.create({
      data: {
        organizationId,
        filename: file.name,
        fileType: getFileTypeFromMime(file.type),
        fileUrl: url,
        fileSize: file.size,
        documentType: documentType as DocumentType,
        programArea: programArea || null,
        status: "PROCESSING",
      },
    });

    // Process asynchronously (don't await)
    processDocumentAsync(
      document.id, 
      buffer, 
      file.type, 
      file.name,
      organizationId, 
      documentType as DocumentType,
      programArea || undefined
    );

    return NextResponse.json(document);
  } catch (error) {
    console.error("Document upload error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "No organization") {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}

async function processDocumentAsync(
  documentId: string,
  buffer: Buffer,
  mimeType: string,
  filename: string,
  organizationId: string,
  documentType: DocumentType,
  programArea?: string
) {
  try {
    await indexDocument(
      documentId,
      buffer,
      mimeType,
      filename,
      organizationId,
      documentType,
      programArea
    );
  } catch (error) {
    console.error("Document processing error:", error);
    // Error is already handled in indexDocument
  }
}

export async function GET() {
  try {
    const { organizationId } = await requireOrganization();

    const documents = await prisma.document.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { chunks: true },
        },
      },
    });

    // Add chunk count to response
    const docsWithStats = documents.map((doc) => ({
      ...doc,
      chunkCount: doc._count.chunks,
      _count: undefined,
    }));

    return NextResponse.json(docsWithStats);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}
