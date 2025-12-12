import { generateEmbedding } from "./openai";
import { queryVectors } from "./pinecone";

export interface RetrievedChunk {
  content: string;
  score: number;
  documentId: string;
  filename: string;
  documentType: string;
  programArea?: string;
}

export async function retrieveRelevantChunks(
  query: string,
  organizationId: string,
  options: {
    topK?: number;
    documentType?: string;
    programArea?: string;
  } = {}
): Promise<RetrievedChunk[]> {
  const { topK = 10, documentType, programArea } = options;

  const queryEmbedding = await generateEmbedding(query);

  const filter: Record<string, unknown> = {};
  if (documentType) {
    filter.documentType = { $eq: documentType };
  }
  if (programArea) {
    filter.programArea = { $eq: programArea };
  }

  const results = await queryVectors(queryEmbedding, organizationId, topK, filter);

  return results.map((match) => ({
    content: (match.metadata as { content: string }).content,
    score: match.score || 0,
    documentId: (match.metadata as { documentId: string }).documentId,
    filename: (match.metadata as { filename: string }).filename,
    documentType: (match.metadata as { documentType: string }).documentType,
    programArea: (match.metadata as { programArea?: string }).programArea,
  }));
}

export function formatContextForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "No relevant context found in the knowledge base.";
  }

  return chunks
    .map((chunk, i) => {
      const source = chunk.programArea
        ? `[Source ${i + 1}: ${chunk.filename} - ${chunk.documentType} - ${chunk.programArea}]`
        : `[Source ${i + 1}: ${chunk.filename} - ${chunk.documentType}]`;
      return `${source}\n${chunk.content}`;
    })
    .join("\n\n---\n\n");
}
