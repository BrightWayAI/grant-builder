import { generateEmbedding, getOpenAI } from "./openai";
import { queryVectors } from "./pinecone";

export interface RetrievedChunk {
  content: string;
  score: number;
  documentId: string;
  filename: string;
  documentType: string;
  programArea?: string;
  relevanceScore?: number;
}

export interface RetrievalOptions {
  topK?: number;
  documentType?: string;
  programArea?: string;
  sectionType?: string;
  useHyDE?: boolean;
  rerank?: boolean;
}

// Map section types to relevant document categories for smarter filtering
// Uses actual DocumentType enum values from Prisma schema
const SECTION_TO_DOCUMENT_TYPES: Record<string, string[]> = {
  "executive_summary": ["PROPOSAL", "ANNUAL_REPORT", "ORG_OVERVIEW", "BOILERPLATE"],
  "organizational_background": ["ORG_OVERVIEW", "ANNUAL_REPORT", "BOILERPLATE", "STAFF_BIOS", "BOARD_BIOS"],
  "statement_of_need": ["IMPACT_REPORT", "ANNUAL_REPORT", "PROGRAM_DESCRIPTION"],
  "goals_objectives": ["PROPOSAL", "LOGIC_MODEL", "PROGRAM_DESCRIPTION"],
  "methods": ["PROPOSAL", "PROGRAM_DESCRIPTION", "LOGIC_MODEL"],
  "evaluation": ["EVALUATION_REPORT", "LOGIC_MODEL", "PROPOSAL", "IMPACT_REPORT"],
  "budget": ["PROPOSAL", "AUDITED_FINANCIALS", "FORM_990"],
  "sustainability": ["PROPOSAL", "ANNUAL_REPORT", "ORG_OVERVIEW"],
  "timeline": ["PROPOSAL", "PROGRAM_DESCRIPTION"],
  "organizational_capacity": ["ORG_OVERVIEW", "STAFF_BIOS", "BOARD_BIOS", "ANNUAL_REPORT"],
};

/**
 * Generate a hypothetical ideal document chunk for better retrieval (HyDE)
 */
async function generateHypotheticalChunk(query: string): Promise<string> {
  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are helping retrieve relevant content from a nonprofit's knowledge base. Given a query about what content is needed, write a short paragraph (2-3 sentences) that represents what an ideal matching document chunk might contain. Be specific and use language typical of grant proposals and nonprofit documents.",
      },
      {
        role: "user",
        content: `Query: ${query}\n\nWrite a hypothetical document chunk that would be highly relevant to this query:`,
      },
    ],
    temperature: 0.7,
    max_tokens: 200,
  });

  return response.choices[0]?.message?.content || query;
}

/**
 * Rerank retrieved chunks by relevance to the original query
 */
async function rerankChunks(
  query: string,
  chunks: RetrievedChunk[],
  topN: number = 5
): Promise<RetrievedChunk[]> {
  if (chunks.length <= topN) {
    return chunks;
  }

  const chunkSummaries = chunks.map((c, i) => `[${i}] ${c.content.slice(0, 300)}...`).join("\n\n");

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are evaluating document chunks for relevance. Return ONLY a JSON array of chunk indices sorted by relevance (most relevant first). Example: [2, 0, 4, 1, 3]",
      },
      {
        role: "user",
        content: `Query: ${query}\n\nChunks:\n${chunkSummaries}\n\nReturn the indices of the ${topN} most relevant chunks as a JSON array:`,
      },
    ],
    temperature: 0,
    max_tokens: 100,
  });

  try {
    const content = response.choices[0]?.message?.content || "[]";
    const indices: number[] = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
    
    return indices
      .slice(0, topN)
      .filter((i) => i >= 0 && i < chunks.length)
      .map((i, rank) => ({
        ...chunks[i],
        relevanceScore: 1 - (rank / topN),
      }));
  } catch {
    // If parsing fails, return top chunks by original score
    return chunks.slice(0, topN);
  }
}

export async function retrieveRelevantChunks(
  query: string,
  organizationId: string,
  options: RetrievalOptions = {}
): Promise<RetrievedChunk[]> {
  const { 
    topK = 10, 
    documentType, 
    programArea, 
    sectionType,
    useHyDE = true,
    rerank = true,
  } = options;

  // Use HyDE for better semantic matching
  let searchQuery = query;
  if (useHyDE) {
    try {
      searchQuery = await generateHypotheticalChunk(query);
    } catch (error) {
      console.warn("HyDE generation failed, using original query:", error);
    }
  }

  let queryEmbedding: number[];
  try {
    queryEmbedding = await generateEmbedding(searchQuery);
  } catch (error) {
    console.error("Embedding generation failed:", error);
    return []; // Graceful fallback - generation will use placeholders
  }

  // Build filter based on document type or section-specific types
  const filter: Record<string, unknown> = {};
  
  if (documentType) {
    filter.documentType = { $eq: documentType };
  } else if (sectionType && SECTION_TO_DOCUMENT_TYPES[sectionType]) {
    // Use section-specific document types for smarter retrieval
    filter.documentType = { $in: SECTION_TO_DOCUMENT_TYPES[sectionType] };
  }
  
  if (programArea) {
    filter.programArea = { $eq: programArea };
  }

  // Retrieve more candidates for reranking
  const retrieveCount = rerank ? Math.min(topK * 2, 20) : topK;
  
  let results;
  try {
    results = await queryVectors(queryEmbedding, organizationId, retrieveCount, filter);
  } catch (error) {
    // Graceful fallback for Pinecone connection issues (DNS, network, outage)
    console.error("Pinecone query failed - generation will proceed with placeholders:", error);
    return [];
  }

  let chunks: RetrievedChunk[] = results.map((match) => ({
    content: (match.metadata as { content: string }).content,
    score: match.score || 0,
    documentId: (match.metadata as { documentId: string }).documentId,
    filename: (match.metadata as { filename: string }).filename,
    documentType: (match.metadata as { documentType: string }).documentType,
    programArea: (match.metadata as { programArea?: string }).programArea,
  }));

  // Rerank for better precision
  if (rerank && chunks.length > topK) {
    try {
      chunks = await rerankChunks(query, chunks, topK);
    } catch (error) {
      console.warn("Reranking failed, using original order:", error);
      chunks = chunks.slice(0, topK);
    }
  }

  return chunks;
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
