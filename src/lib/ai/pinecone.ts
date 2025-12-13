import { Pinecone, Index } from "@pinecone-database/pinecone";

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
  await index.upsert(records);
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

export async function deleteVectorsByDocumentId(documentId: string) {
  const index = getIndex();
  await index.deleteMany({
    filter: {
      documentId: { $eq: documentId },
    },
  });
}

export async function deleteVectorsByOrganizationId(organizationId: string) {
  const index = getIndex();
  await index.deleteMany({
    filter: {
      organizationId: { $eq: organizationId },
    },
  });
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
    const stats = await index.describeIndexStats();
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
