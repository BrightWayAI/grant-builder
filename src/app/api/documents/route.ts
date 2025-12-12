import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import prisma from "@/lib/db";
import { uploadFile } from "@/lib/storage";
import { extractTextFromFile, isValidFileType, getFileTypeFromMime } from "@/lib/ai/document-parser";
import { indexDocument } from "@/lib/ai/embeddings";
import { DocumentType } from "@prisma/client";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await requireOrganization();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentType = formData.get("documentType") as string;

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

    const { url } = await uploadFile(
      buffer,
      file.name,
      file.type,
      organizationId,
      "documents"
    );

    const document = await prisma.document.create({
      data: {
        organizationId,
        filename: file.name,
        fileType: getFileTypeFromMime(file.type),
        fileUrl: url,
        fileSize: file.size,
        documentType: documentType as DocumentType,
        status: "PROCESSING",
      },
    });

    processDocumentAsync(document.id, buffer, file.type, organizationId, documentType as DocumentType, file.name);

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
  organizationId: string,
  documentType: DocumentType,
  filename: string
) {
  try {
    const text = await extractTextFromFile(buffer, mimeType);
    await indexDocument(documentId, text, organizationId, documentType, filename);
  } catch (error) {
    console.error("Document processing error:", error);
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Processing failed",
      },
    });
  }
}

export async function GET() {
  try {
    const { organizationId } = await requireOrganization();

    const documents = await prisma.document.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}
