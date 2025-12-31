import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import prisma from "@/lib/db";

interface TracedContent {
  text: string;
  sources: Array<{
    documentId: string;
    documentName: string;
    matchedText: string;
    similarity: number;
    pageNumber?: number;
  }>;
  status: "grounded" | "partial" | "ungrounded";
}

interface ChunkAttribution {
  chunkId: string;
  documentId: string;
  filename: string;
  similarity: number;
  matchedText?: string;
  content?: string;
  pageNumber?: number;
}

/**
 * POST /api/proposals/[id]/sections/[sectionId]/trace
 * 
 * Traces sources for content - returns which parts are sourced and from where.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; sectionId: string } }
) {
  try {
    const { organizationId } = await requireOrganization();

    const proposal = await prisma.proposal.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const body = await request.json();
    const { text, fullSection } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Get attributed paragraphs for this section
    const attributedParagraphs = await prisma.attributedParagraph.findMany({
      where: { sectionId: params.sectionId },
      orderBy: { paragraphIndex: "asc" },
    });

    const traced: TracedContent[] = [];

    if (fullSection) {
      // Return traceability for each paragraph
      for (const para of attributedParagraphs) {
        const chunks = (para.supportingChunks as unknown as ChunkAttribution[]) || [];
        
        traced.push({
          text: para.text.slice(0, 200) + (para.text.length > 200 ? "..." : ""),
          sources: chunks.slice(0, 3).map((chunk) => ({
            documentId: chunk.documentId,
            documentName: chunk.filename,
            matchedText: (chunk.matchedText || chunk.content || "").slice(0, 150),
            similarity: chunk.similarity,
            pageNumber: chunk.pageNumber,
          })),
          status: para.status.toLowerCase() as TracedContent["status"],
        });
      }
    } else {
      // Find paragraphs that match the selected text
      const normalizedText = text.toLowerCase().trim();
      
      for (const para of attributedParagraphs) {
        if (para.text.toLowerCase().includes(normalizedText) || 
            normalizedText.includes(para.text.toLowerCase().slice(0, 50))) {
          const chunks = (para.supportingChunks as unknown as ChunkAttribution[]) || [];
          
          traced.push({
            text: text.slice(0, 200) + (text.length > 200 ? "..." : ""),
            sources: chunks.slice(0, 3).map((chunk) => ({
              documentId: chunk.documentId,
              documentName: chunk.filename,
              matchedText: (chunk.matchedText || chunk.content || "").slice(0, 150),
              similarity: chunk.similarity,
              pageNumber: chunk.pageNumber,
            })),
            status: para.status.toLowerCase() as TracedContent["status"],
          });
          break; // Found matching paragraph
        }
      }

      // If no paragraph matched, return ungrounded status
      if (traced.length === 0) {
        traced.push({
          text: text.slice(0, 200) + (text.length > 200 ? "..." : ""),
          sources: [],
          status: "ungrounded",
        });
      }
    }

    return NextResponse.json({ traced });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Trace sources error:", error);
    return NextResponse.json({ error: "Failed to trace sources" }, { status: 500 });
  }
}
