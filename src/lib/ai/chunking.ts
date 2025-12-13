import { DocumentSection } from "./document-processor";

export interface Chunk {
  content: string;
  index: number;
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  sectionTitle?: string;
  sectionLevel?: number;
  isComplete: boolean; // Whether this chunk is a complete thought
  startChar: number;
  endChar: number;
}

// Optimal chunk sizes for different embedding models
// text-embedding-3-large has 8191 token limit, but smaller chunks = better retrieval
const TARGET_CHUNK_SIZE = 800; // characters (~200 tokens)
const MAX_CHUNK_SIZE = 1500; // absolute maximum
const MIN_CHUNK_SIZE = 200; // don't create tiny chunks
const OVERLAP_SIZE = 100; // overlap between chunks for context

/**
 * Smart chunking that respects document structure
 * 1. First try to chunk by sections
 * 2. Within sections, chunk by paragraphs
 * 3. Fall back to sentence-based chunking
 */
export function createChunks(
  text: string,
  sections: DocumentSection[] = []
): Chunk[] {
  const chunks: Chunk[] = [];
  let chunkIndex = 0;
  
  // If we have sections, use them as natural boundaries
  if (sections.length > 0) {
    for (const section of sections) {
      const sectionChunks = chunkSection(section, chunkIndex);
      chunks.push(...sectionChunks);
      chunkIndex += sectionChunks.length;
    }
    
    // Handle any text not captured in sections
    const sectionedText = sections.map((s) => s.content).join(" ");
    if (sectionedText.length < text.length * 0.8) {
      // More than 20% of text wasn't in sections, chunk the whole thing
      const fallbackChunks = chunkText(text, chunkIndex);
      chunks.push(...fallbackChunks);
    }
  } else {
    // No sections, use paragraph-based chunking
    const paragraphChunks = chunkByParagraphs(text, chunkIndex);
    chunks.push(...paragraphChunks);
  }
  
  return chunks;
}

/**
 * Chunk a section, keeping section context in metadata
 */
function chunkSection(section: DocumentSection, startIndex: number): Chunk[] {
  if (!section.content || section.content.length === 0) {
    return [];
  }
  
  const chunks: Chunk[] = [];
  
  // If section fits in one chunk, use it as-is
  if (section.content.length <= MAX_CHUNK_SIZE) {
    chunks.push({
      content: `${section.title}\n\n${section.content}`.trim(),
      index: startIndex,
      metadata: {
        sectionTitle: section.title,
        sectionLevel: section.level,
        isComplete: true,
        startChar: 0,
        endChar: section.content.length,
      },
    });
    return chunks;
  }
  
  // Otherwise, chunk the section content
  const contentChunks = chunkByParagraphs(section.content, startIndex);
  
  // Add section context to each chunk
  return contentChunks.map((chunk, i) => ({
    ...chunk,
    content: i === 0 
      ? `${section.title}\n\n${chunk.content}` 
      : `[${section.title} continued]\n\n${chunk.content}`,
    metadata: {
      ...chunk.metadata,
      sectionTitle: section.title,
      sectionLevel: section.level,
    },
  }));
}

/**
 * Chunk text by paragraphs, grouping small paragraphs together
 */
function chunkByParagraphs(text: string, startIndex: number): Chunk[] {
  const chunks: Chunk[] = [];
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  
  let currentChunk = "";
  let currentStart = 0;
  let chunkIndex = startIndex;
  
  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim();
    
    // If adding this paragraph would exceed max, save current and start new
    if (currentChunk.length + trimmedPara.length > MAX_CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex++,
        metadata: {
          isComplete: true,
          startChar: currentStart,
          endChar: currentStart + currentChunk.length,
        },
      });
      
      // Start new chunk with overlap
      const overlapText = getOverlapText(currentChunk);
      currentStart = currentStart + currentChunk.length - overlapText.length;
      currentChunk = overlapText + "\n\n" + trimmedPara;
    } else {
      // Add paragraph to current chunk
      currentChunk += (currentChunk ? "\n\n" : "") + trimmedPara;
    }
  }
  
  // Save final chunk if it meets minimum size
  if (currentChunk.trim().length >= MIN_CHUNK_SIZE) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex,
      metadata: {
        isComplete: true,
        startChar: currentStart,
        endChar: currentStart + currentChunk.length,
      },
    });
  } else if (chunks.length > 0) {
    // Append to previous chunk if too small
    const lastChunk = chunks[chunks.length - 1];
    lastChunk.content += "\n\n" + currentChunk.trim();
    lastChunk.metadata.endChar += currentChunk.length + 2;
  } else if (currentChunk.trim().length > 0) {
    // Keep small chunk if it's the only content
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex,
      metadata: {
        isComplete: true,
        startChar: currentStart,
        endChar: currentStart + currentChunk.length,
      },
    });
  }
  
  return chunks;
}

/**
 * Fallback: chunk by sentences when paragraphs aren't clear
 */
function chunkText(text: string, startIndex: number): Chunk[] {
  const chunks: Chunk[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  let currentChunk = "";
  let currentStart = 0;
  let chunkIndex = startIndex;
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > TARGET_CHUNK_SIZE && currentChunk.length > MIN_CHUNK_SIZE) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex++,
        metadata: {
          isComplete: currentChunk.endsWith(".") || currentChunk.endsWith("!") || currentChunk.endsWith("?"),
          startChar: currentStart,
          endChar: currentStart + currentChunk.length,
        },
      });
      
      // Start new chunk with overlap
      const overlapText = getOverlapText(currentChunk);
      currentStart = currentStart + currentChunk.length - overlapText.length;
      currentChunk = overlapText + " " + sentence;
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
  }
  
  // Save final chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex,
      metadata: {
        isComplete: true,
        startChar: currentStart,
        endChar: currentStart + currentChunk.length,
      },
    });
  }
  
  return chunks;
}

/**
 * Get overlap text from end of chunk (last ~OVERLAP_SIZE chars, respecting word boundaries)
 */
function getOverlapText(text: string): string {
  if (text.length <= OVERLAP_SIZE) return "";
  
  const candidate = text.slice(-OVERLAP_SIZE);
  const firstSpace = candidate.indexOf(" ");
  
  if (firstSpace > 0) {
    return candidate.slice(firstSpace + 1);
  }
  return candidate;
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 chars)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
