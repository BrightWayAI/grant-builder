import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth";
import prisma from "@/lib/db";

interface ChunkAttribution {
  chunkId: string;
  documentId: string;
  filename: string;
  similarity: number;
  matchedText: string;
  pageNumber?: number;
}

/**
 * GET /api/proposals/[id]/sections/[sectionId]/citations
 * 
 * Returns citation data for a section, including:
 * - Citations from attributed paragraphs
 * - Placeholder information
 */
export async function GET(
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

    const section = await prisma.proposalSection.findFirst({
      where: {
        id: params.sectionId,
        proposalId: params.id,
      },
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    // Get attributed paragraphs with supporting chunks
    const attributedParagraphs = await prisma.attributedParagraph.findMany({
      where: { sectionId: params.sectionId },
      orderBy: { paragraphIndex: "asc" },
    });

    // Get latest generation metadata
    const generationMetadata = await prisma.generationMetadata.findFirst({
      where: { sectionId: params.sectionId },
      orderBy: { generatedAt: "desc" },
    });

    // Extract unique citations from all paragraphs
    const citationMap = new Map<string, ChunkAttribution>();
    let citationIndex = 1;
    
    for (const para of attributedParagraphs) {
      const chunks = (para.supportingChunks as unknown as ChunkAttribution[]) || [];
      for (const chunk of chunks) {
        const key = `${chunk.documentId}_${chunk.chunkId}`;
        if (!citationMap.has(key) && chunk.similarity >= 0.50) {
          citationMap.set(key, { ...chunk });
        }
      }
    }

    // Format citations for frontend consumption
    const citations = Array.from(citationMap.values()).map((chunk, index) => ({
      citationNumber: index + 1,
      documentId: chunk.documentId,
      documentName: chunk.filename,
      matchedText: chunk.matchedText?.slice(0, 150) || "",
      similarity: chunk.similarity,
      pageNumber: chunk.pageNumber,
      chunkId: chunk.chunkId,
    }));

    // Get placeholder data from section content
    const placeholders = extractPlaceholdersFromContent(section.content || "");

    return NextResponse.json({
      sectionId: params.sectionId,
      citations,
      placeholders,
      metadata: {
        retrievedChunkCount: generationMetadata?.retrievedChunkCount || 0,
        claimsReplaced: generationMetadata?.claimsReplaced || 0,
        paragraphsPlaceholdered: generationMetadata?.paragraphsPlaceholdered || 0,
        enforcementApplied: generationMetadata?.enforcementApplied || false,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Citations fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch citations" }, { status: 500 });
  }
}

/**
 * Extract placeholder data from content text
 */
function extractPlaceholdersFromContent(content: string): Array<{
  id: string;
  type: string;
  description: string;
}> {
  const regex = /\[\[PLACEHOLDER:(\w+):([^:]+):(\w+)\]\]/g;
  const placeholders: Array<{ id: string; type: string; description: string }> = [];
  
  let match;
  while ((match = regex.exec(content)) !== null) {
    placeholders.push({
      id: match[3],
      type: match[1],
      description: match[2],
    });
  }
  
  return placeholders;
}
