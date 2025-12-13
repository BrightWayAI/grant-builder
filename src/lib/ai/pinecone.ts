import { Pinecone, Index } from "@pinecone-database/pinecone";
import prisma from "@/lib/db";

let pineconeClient: Pinecone | null = null;
let pineconeIndex: Index | null = null;

function getPinecone(): Pinecone {
  if (!pineconeClient) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error("PINECONE_API_KEY is not configured. Add it to your environment variables.");
    }
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }
  return pineconeClient;
}

export function getIndex(): Index {
  if (!pineconeIndex) {
    const indexName = process.env.PINECONE_INDEX;
    if (!indexName) {
      throw new Error(
        "PINECONE_INDEX is not configured. " +
        "Create an index in Pinecone (https://app.pinecone.io) with dimension 3072 for text-embedding-3-large, " +
        "then set PINECONE_INDEX=your-index-name in your environment."
      );
    }
    pineconeIndex = getPinecone().index(indexName);
  }
  return pineconeIndex;
}

export interface VectorMetadata {
  organizationId: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  documentType: string;
  programArea?: string;
  filename: string;
  sectionTitle?: string;
  isComplete?: boolean;
  funderType?: string;
}

export async function upsertVectors(
  vectors: { id: string; values: number[]; metadata: VectorMetadata }[]
) {
  const index = getIndex();
  const records = vectors.map((v) => ({
    id: v.id,
    values: v.values,
    metadata: v.metadata as unknown as Record<string, string | number | boolean | string[]>,
  }));
  
  // Upsert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await index.upsert(batch);
  }
}

export async function queryVectors(
  embedding: number[],
  organizationId: string,
  topK: number = 10,
  filter?: Record<string, unknown>
) {
  const index = getIndex();
  
  const results = await index.query({
    vector: embedding,
    topK,
    includeMetadata: true,
    filter: {
      organizationId: { $eq: organizationId },
      ...filter,
    },
  });

  return results.matches || [];
}

/**
 * Delete vectors by document ID
 * For serverless Pinecone, we need to look up the vector IDs from our database
 * since deleteMany with filters isn't supported
 */
export async function deleteVectorsByDocumentId(documentId: string): Promise<void> {
  try {
    // Get vector IDs from our database
    const chunks = await prisma.documentChunk.findMany({
      where: { documentId },
      select: { pineconeId: true },
    });

    if (chunks.length === 0) {
      console.log(`No chunks found for document ${documentId}`);
      return;
    }

    const vectorIds = chunks.map((c) => c.pineconeId);
    console.log(`Deleting ${vectorIds.length} vectors for document ${documentId}`);

    // Delete by IDs in batches
    const index = getIndex();
    const batchSize = 100;
    
    for (let i = 0; i < vectorIds.length; i += batchSize) {
      const batch = vectorIds.slice(i, i + batchSize);
      await index.deleteMany(batch);
    }
  } catch (error) {
    // If deletion fails, log but don't throw - the vectors will be orphaned but won't break anything
    console.error(`Error deleting vectors for document ${documentId}:`, error);
  }
}

/**
 * Delete vectors by organization ID
 * This queries our database for all vector IDs belonging to the org
 */
export async function deleteVectorsByOrganizationId(organizationId: string): Promise<void> {
  try {
    // Get all documents for this org
    const documents = await prisma.document.findMany({
      where: { organizationId },
      select: { id: true },
    });

    // Delete vectors for each document
    for (const doc of documents) {
      await deleteVectorsByDocumentId(doc.id);
    }
  } catch (error) {
    console.error(`Error deleting vectors for organization ${organizationId}:`, error);
  }
}

/**
 * Check if Pinecone is properly configured
 */
export async function checkPineconeHealth(): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!process.env.PINECONE_API_KEY) {
      return { ok: false, error: "PINECONE_API_KEY not configured" };
    }
    if (!process.env.PINECONE_INDEX) {
      return { ok: false, error: "PINECONE_INDEX not configured" };
    }
    
    const index = getIndex();
    await index.describeIndexStats();
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("404")) {
      return { 
        ok: false, 
        error: `Index '${process.env.PINECONE_INDEX}' not found. Create it at https://app.pinecone.io with dimension 3072.` 
      };
    }
    return { ok: false, error: message };
  }
}
