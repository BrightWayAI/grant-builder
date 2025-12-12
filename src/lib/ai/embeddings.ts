import { v4 as uuidv4 } from "uuid";
import { generateEmbeddings } from "./openai";
import { upsertVectors, deleteVectorsByDocumentId, VectorMetadata } from "./pinecone";
import prisma from "@/lib/db";
import { DocumentType } from "@prisma/client";

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

export function chunkText(text: string): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  let currentChunk = "";
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      const words = currentChunk.split(/\s+/);
      const overlapWords = words.slice(-Math.floor(CHUNK_OVERLAP / 5));
      currentChunk = overlapWords.join(" ") + " " + sentence;
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

export async function indexDocument(
  documentId: string,
  content: string,
  organizationId: string,
  documentType: DocumentType,
  filename: string,
  programArea?: string
): Promise<void> {
  try {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "PROCESSING" },
    });

    const chunks = chunkText(content);
    
    if (chunks.length === 0) {
      throw new Error("No content to index");
    }

    const embeddings = await generateEmbeddings(chunks);

    const vectors: { id: string; values: number[]; metadata: VectorMetadata }[] = [];
    const dbChunks: { content: string; chunkIndex: number; pineconeId: string }[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const pineconeId = uuidv4();
      vectors.push({
        id: pineconeId,
        values: embeddings[i],
        metadata: {
          organizationId,
          documentId,
          chunkIndex: i,
          content: chunks[i],
          documentType,
          programArea,
          filename,
        },
      });
      dbChunks.push({
        content: chunks[i],
        chunkIndex: i,
        pineconeId,
      });
    }

    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await upsertVectors(batch);
    }

    await prisma.documentChunk.createMany({
      data: dbChunks.map((chunk) => ({
        documentId,
        ...chunk,
      })),
    });

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "INDEXED" },
    });
  } catch (error) {
    console.error("Error indexing document:", error);
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });
    throw error;
  }
}

export async function deleteDocumentIndex(documentId: string): Promise<void> {
  await deleteVectorsByDocumentId(documentId);
  await prisma.documentChunk.deleteMany({
    where: { documentId },
  });
}
