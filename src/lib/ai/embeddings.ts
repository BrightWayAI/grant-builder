import { v4 as uuidv4 } from "uuid";
import { generateEmbeddings } from "./openai";
import { upsertVectors, deleteVectorsByDocumentId, VectorMetadata } from "./pinecone";
import { processDocument, ProcessedDocument } from "./document-processor";
import { createChunks, Chunk } from "./chunking";
import prisma from "@/lib/db";
import { DocumentType } from "@prisma/client";

const EMBEDDING_BATCH_SIZE = 20; // OpenAI recommends batches of 20 for embeddings
const PINECONE_BATCH_SIZE = 100;

export interface IndexingProgress {
  stage: "processing" | "chunking" | "embedding" | "storing" | "complete" | "failed";
  progress: number; // 0-100
  chunksTotal?: number;
  chunksProcessed?: number;
  message?: string;
}

export type ProgressCallback = (progress: IndexingProgress) => void;

/**
 * Index a document with improved chunking and metadata
 */
export async function indexDocument(
  documentId: string,
  buffer: Buffer,
  mimeType: string,
  filename: string,
  organizationId: string,
  documentType: DocumentType,
  programArea?: string,
  onProgress?: ProgressCallback
): Promise<void> {
  const report = (progress: IndexingProgress) => {
    onProgress?.(progress);
    console.log(`[${documentId}] ${progress.stage}: ${progress.progress}% - ${progress.message || ""}`);
  };

  try {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "PROCESSING" },
    });

    // Stage 1: Process document
    report({ stage: "processing", progress: 10, message: "Extracting text..." });
    
    const processed: ProcessedDocument = await processDocument(
      buffer,
      mimeType,
      filename,
      documentType
    );

    if (!processed.text || processed.text.length < 50) {
      throw new Error("Document contains no extractable text");
    }

    // Stage 2: Create chunks
    report({ stage: "chunking", progress: 20, message: "Creating chunks..." });
    
    const chunks = createChunks(processed.text, processed.sections);
    
    if (chunks.length === 0) {
      throw new Error("No content to index");
    }

    report({ 
      stage: "chunking", 
      progress: 30, 
      message: `Created ${chunks.length} chunks`,
      chunksTotal: chunks.length,
      chunksProcessed: 0,
    });

    // Stage 3: Generate embeddings in batches
    const allEmbeddings: number[][] = [];
    
    for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
      const batchTexts = batch.map((c) => c.content);
      
      const embeddings = await generateEmbeddings(batchTexts);
      allEmbeddings.push(...embeddings);
      
      const processed = Math.min(i + EMBEDDING_BATCH_SIZE, chunks.length);
      const progress = 30 + Math.floor((processed / chunks.length) * 50);
      
      report({
        stage: "embedding",
        progress,
        message: `Embedding chunks ${processed}/${chunks.length}`,
        chunksTotal: chunks.length,
        chunksProcessed: processed,
      });
    }

    // Stage 4: Store in Pinecone and database
    report({ stage: "storing", progress: 80, message: "Storing vectors..." });

    const vectors: { id: string; values: number[]; metadata: VectorMetadata }[] = [];
    const dbChunks: { 
      content: string; 
      chunkIndex: number; 
      pineconeId: string;
      metadata: object;
    }[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const pineconeId = uuidv4();
      
      vectors.push({
        id: pineconeId,
        values: allEmbeddings[i],
        metadata: {
          organizationId,
          documentId,
          chunkIndex: chunk.index,
          content: chunk.content,
          documentType,
          programArea,
          filename,
          sectionTitle: chunk.metadata.sectionTitle,
          isComplete: chunk.metadata.isComplete,
        },
      });
      
      dbChunks.push({
        content: chunk.content,
        chunkIndex: chunk.index,
        pineconeId,
        metadata: {
          sectionTitle: chunk.metadata.sectionTitle,
          sectionLevel: chunk.metadata.sectionLevel,
          isComplete: chunk.metadata.isComplete,
          startChar: chunk.metadata.startChar,
          endChar: chunk.metadata.endChar,
        },
      });
    }

    // Upsert to Pinecone in batches
    for (let i = 0; i < vectors.length; i += PINECONE_BATCH_SIZE) {
      const batch = vectors.slice(i, i + PINECONE_BATCH_SIZE);
      await upsertVectors(batch);
    }

    // Store chunks in database
    await prisma.documentChunk.createMany({
      data: dbChunks.map((chunk) => ({
        documentId,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        pineconeId: chunk.pineconeId,
        metadata: chunk.metadata,
      })),
    });

    // Update document with metadata
    await prisma.document.update({
      where: { id: documentId },
      data: { 
        status: "INDEXED",
        // Store extracted metadata
      },
    });

    report({ 
      stage: "complete", 
      progress: 100, 
      message: `Indexed ${chunks.length} chunks`,
      chunksTotal: chunks.length,
      chunksProcessed: chunks.length,
    });
    
  } catch (error) {
    console.error("Error indexing document:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "FAILED",
        errorMessage,
      },
    });
    
    report({ 
      stage: "failed", 
      progress: 0, 
      message: errorMessage,
    });
    
    throw error;
  }
}

/**
 * Legacy function signature for backwards compatibility
 */
export async function indexDocumentLegacy(
  documentId: string,
  content: string,
  organizationId: string,
  documentType: DocumentType,
  filename: string,
  programArea?: string
): Promise<void> {
  // Convert to buffer and process
  const buffer = Buffer.from(content, "utf-8");
  await indexDocument(
    documentId,
    buffer,
    "text/plain",
    filename,
    organizationId,
    documentType,
    programArea
  );
}

/**
 * Delete document from index
 * This is safe to call even if the document was never indexed
 */
export async function deleteDocumentIndex(documentId: string): Promise<void> {
  try {
    await deleteVectorsByDocumentId(documentId);
  } catch (error) {
    // Log but don't throw - vectors may not exist
    console.error(`Failed to delete vectors for ${documentId}:`, error);
  }
  
  // Always clean up database chunks
  await prisma.documentChunk.deleteMany({
    where: { documentId },
  });
}

/**
 * Re-index an existing document
 */
export async function reindexDocument(
  documentId: string,
  buffer: Buffer,
  mimeType: string,
  onProgress?: ProgressCallback
): Promise<void> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });
  
  if (!document) {
    throw new Error("Document not found");
  }
  
  // Delete existing chunks
  await deleteDocumentIndex(documentId);
  
  // Re-index
  await indexDocument(
    documentId,
    buffer,
    mimeType,
    document.filename,
    document.organizationId,
    document.documentType,
    document.programArea || undefined,
    onProgress
  );
}
