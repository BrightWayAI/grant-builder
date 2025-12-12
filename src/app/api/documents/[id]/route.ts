import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import prisma from "@/lib/db";
import { deleteFile, getKeyFromUrl } from "@/lib/storage";
import { deleteDocumentIndex } from "@/lib/ai/embeddings";

export async function DELETE(
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

    await deleteDocumentIndex(document.id);

    try {
      const key = getKeyFromUrl(document.fileUrl);
      await deleteFile(key);
    } catch (error) {
      console.error("Failed to delete file from storage:", error);
    }

    await prisma.document.delete({
      where: { id: document.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Document deletion error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}

export async function GET(
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
      include: {
        chunks: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}
