import { Pinecone, Index } from "@pinecone-database/pinecone";

let pineconeClient: Pinecone | null = null;
let pineconeIndex: Index | null = null;

function getPinecone(): Pinecone {
  if (!pineconeClient) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error("PINECONE_API_KEY is not configured");
    }
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }
  return pineconeClient;
}

export function getIndex(): Index {
  if (!pineconeIndex) {
    const indexName = process.env.PINECONE_INDEX || "brightway-grants";
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
}

export async function upsertVectors(
  vectors: { id: string; values: number[]; metadata: VectorMetadata }[]
) {
  const index = getIndex();
  // Cast metadata to satisfy Pinecone's type requirements
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
