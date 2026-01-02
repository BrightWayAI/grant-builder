/**
 * Citation Mapper
 * 
 * Maps generated paragraphs to source chunks from retrieval.
 * Uses embedding-based cosine similarity for accurate semantic matching.
 * 
 * Flow:
 * 1. Generate embeddings for each paragraph
 * 2. Query Pinecone to find semantically similar KB chunks
 * 3. Use cosine similarity scores for grounding determination
 */

import prisma from '@/lib/db';
import { generateEmbedding, generateEmbeddings } from '@/lib/ai/openai';
import { queryVectors } from '@/lib/ai/pinecone';
import {
  AttributedParagraph,
  ChunkAttribution,
  ParagraphStatus,
  ParagraphFlag,
  SectionCoverage,
  SourceContribution,
  RetrievedChunkForAttribution
} from '@/types/enforcement';
import { ENFORCEMENT_THRESHOLDS } from './thresholds';
import { generateId } from '@/lib/utils';

export interface CitationMapperInput {
  sectionId: string;
  generatedText: string;
  retrievedChunks: RetrievedChunkForAttribution[];
  organizationId: string;
}

export interface CitationMapperOutput {
  paragraphs: AttributedParagraph[];
  sectionCoverage: SectionCoverage;
}

export class CitationMapper {
  /**
   * Map citations for a section and persist to database
   */
  async mapAndPersist(input: CitationMapperInput): Promise<CitationMapperOutput> {
    const output = await this.mapCitations(input);
    
    // Delete existing attribution data for this section
    await prisma.attributedParagraph.deleteMany({
      where: { sectionId: input.sectionId }
    });

    // Persist attributed paragraphs
    for (const para of output.paragraphs) {
      await prisma.attributedParagraph.create({
        data: {
          sectionId: input.sectionId,
          paragraphIndex: para.index,
          text: para.text,
          attributionScore: para.attributionScore,
          status: para.status,
          flags: para.flags,
          supportingChunks: JSON.parse(JSON.stringify(para.supportingChunks))
        }
      });
    }

    // Persist or update section coverage
    await prisma.sectionCoverageRecord.upsert({
      where: { sectionId: input.sectionId },
      create: {
        sectionId: input.sectionId,
        coverageScore: output.sectionCoverage.coverageScore,
        groundedCount: output.sectionCoverage.groundedCount,
        partialCount: output.sectionCoverage.partialCount,
        ungroundedCount: output.sectionCoverage.ungroundedCount,
        totalParagraphs: output.sectionCoverage.totalParagraphs,
        sourceDocuments: JSON.parse(JSON.stringify(output.sectionCoverage.sourceDocuments))
      },
      update: {
        coverageScore: output.sectionCoverage.coverageScore,
        groundedCount: output.sectionCoverage.groundedCount,
        partialCount: output.sectionCoverage.partialCount,
        ungroundedCount: output.sectionCoverage.ungroundedCount,
        totalParagraphs: output.sectionCoverage.totalParagraphs,
        sourceDocuments: JSON.parse(JSON.stringify(output.sectionCoverage.sourceDocuments)),
        computedAt: new Date()
      }
    });

    return output;
  }

  /**
   * Map citations without persisting (for preview/testing)
   */
  async mapCitations(input: CitationMapperInput): Promise<CitationMapperOutput> {
    const { sectionId, generatedText, retrievedChunks, organizationId } = input;
    
    // Get section info
    const section = await prisma.proposalSection.findUnique({
      where: { id: sectionId }
    });

    if (!section) {
      throw new Error(`Section not found: ${sectionId}`);
    }

    // Split text into paragraphs
    const paragraphTexts = this.splitIntoParagraphs(generatedText);
    
    if (paragraphTexts.length === 0) {
      return {
        paragraphs: [],
        sectionCoverage: this.emptyCoverage(sectionId, section.sectionName)
      };
    }

    const attributedParagraphs: AttributedParagraph[] = [];

    // Process paragraphs with embedding-based similarity
    // The retrieved chunks are passed as fallback, but primary attribution uses Pinecone queries
    for (let i = 0; i < paragraphTexts.length; i++) {
      const paraText = paragraphTexts[i];
      const attributed = await this.attributeParagraph(
        paraText, 
        i, 
        sectionId, 
        retrievedChunks,
        organizationId
      );
      attributedParagraphs.push(attributed);
    }
    
    // If no chunks and attribution failed, try retrieving fresh chunks
    const hasFailures = attributedParagraphs.some(p => p.status === 'FAILED' || p.status === 'UNGROUNDED');
    if (retrievedChunks.length === 0 && hasFailures) {
      try {
        const freshChunks = await this.retrieveChunksForSection(
          section.sectionName,
          section.description || '',
          organizationId
        );
        
        // Re-attribute paragraphs that failed
        for (let i = 0; i < attributedParagraphs.length; i++) {
          if (attributedParagraphs[i].status === 'FAILED' || attributedParagraphs[i].status === 'UNGROUNDED') {
            const paraText = paragraphTexts[i];
            attributedParagraphs[i] = await this.attributeParagraph(
              paraText, 
              i, 
              sectionId, 
              freshChunks,
              organizationId
            );
          }
        }
      } catch (error) {
        console.error('Failed to retrieve chunks for attribution:', error);
        // Mark all paragraphs as failed
        for (let i = 0; i < paragraphTexts.length; i++) {
          attributedParagraphs.push({
            id: generateId(),
            sectionId,
            index: i,
            text: paragraphTexts[i],
            supportingChunks: [],
            attributionScore: 0,
            status: 'FAILED',
            flags: ['ATTRIBUTION_FAILED']
          });
        }
      }
    }

    const sectionCoverage = this.computeSectionCoverage(
      sectionId,
      section.sectionName,
      attributedParagraphs
    );

    return {
      paragraphs: attributedParagraphs,
      sectionCoverage
    };
  }

  /**
   * Attribute a single paragraph to source chunks using embedding similarity
   */
  private async attributeParagraph(
    paragraphText: string,
    index: number,
    sectionId: string,
    chunks: RetrievedChunkForAttribution[],
    organizationId: string
  ): Promise<AttributedParagraph> {
    const supportingChunks: ChunkAttribution[] = [];
    let bestScore = 0;

    // Skip very short paragraphs (likely formatting artifacts)
    if (paragraphText.trim().length < 20) {
      return {
        id: generateId(),
        sectionId,
        index,
        text: paragraphText,
        supportingChunks: [],
        attributionScore: 1, // Don't penalize short content
        status: 'GROUNDED',
        flags: []
      };
    }

    try {
      // Generate embedding for this paragraph and query Pinecone for similar chunks
      const embedding = await generateEmbedding(paragraphText);
      const similarChunks = await queryVectors(embedding, organizationId, 5);
      
      // Map Pinecone results to chunk attributions
      for (const result of similarChunks) {
        const metadata = result.metadata as { 
          content?: string; 
          filename?: string; 
          documentId?: string;
          chunkId?: string;
        };
        const similarity = result.score || 0;
        
        if (similarity >= ENFORCEMENT_THRESHOLDS.PARTIAL_SIMILARITY) {
          supportingChunks.push({
            chunkId: metadata.chunkId || result.id,
            documentId: metadata.documentId || '',
            documentName: metadata.filename || 'Unknown',
            similarity,
            matchedSpan: this.extractMatchedSpan(metadata.content || '', paragraphText)
          });
          
          if (similarity > bestScore) {
            bestScore = similarity;
          }
        }
      }
    } catch (error) {
      console.error('[CitationMapper] Embedding-based attribution failed, falling back to text similarity:', error);
      // Fallback to text similarity if embedding fails
      for (const chunk of chunks) {
        const similarity = this.calculateTextSimilarity(paragraphText, chunk.text);
        
        if (similarity >= ENFORCEMENT_THRESHOLDS.PARTIAL_SIMILARITY) {
          supportingChunks.push({
            chunkId: chunk.id,
            documentId: chunk.documentId,
            documentName: chunk.documentName,
            similarity,
            matchedSpan: this.extractMatchedSpan(chunk.text, paragraphText)
          });
          
          if (similarity > bestScore) {
            bestScore = similarity;
          }
        }
      }
    }

    // Sort by similarity and take top N
    supportingChunks.sort((a, b) => b.similarity - a.similarity);
    const topChunks = supportingChunks.slice(0, ENFORCEMENT_THRESHOLDS.MAX_SUPPORTING_CHUNKS);

    // Determine status
    const status = this.determineStatus(bestScore);
    const flags = this.determineFlags(status, paragraphText);

    return {
      id: generateId(),
      sectionId,
      index,
      text: paragraphText,
      supportingChunks: topChunks,
      attributionScore: bestScore,
      status,
      flags
    };
  }

  /**
   * Extract a relevant span from the chunk that matches the paragraph
   */
  private extractMatchedSpan(chunkText: string, paragraphText: string): string {
    if (!chunkText) return '';
    
    // Find overlapping keywords to locate relevant section
    const paraWords = paragraphText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const chunkLower = chunkText.toLowerCase();
    
    // Find first matching significant word
    for (const word of paraWords.slice(0, 10)) {
      const idx = chunkLower.indexOf(word);
      if (idx >= 0) {
        const start = Math.max(0, idx - 30);
        const end = Math.min(chunkText.length, idx + 120);
        return (start > 0 ? '...' : '') + chunkText.slice(start, end).trim() + (end < chunkText.length ? '...' : '');
      }
    }
    
    // Return first 150 chars if no keyword match
    return chunkText.slice(0, 150).trim() + (chunkText.length > 150 ? '...' : '');
  }

  /**
   * Calculate text similarity using word overlap (Jaccard-like)
   * This is a fallback when we don't have embeddings
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = this.tokenize(text1);
    const words2 = this.tokenize(text2);
    
    if (words1.length === 0 || words2.length === 0) {
      return 0;
    }

    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    // Calculate intersection
    let intersection = 0;
    words1.forEach(word => {
      if (set2.has(word)) {
        intersection++;
      }
    });
    
    // Jaccard similarity
    const union = set1.size + set2.size - intersection;
    const jaccard = union > 0 ? intersection / union : 0;

    // Also check for phrase matches (n-grams)
    const phraseBonus = this.calculatePhraseOverlap(text1, text2);
    
    // Combine scores (weighted)
    return Math.min(1, jaccard * 0.7 + phraseBonus * 0.3);
  }

  /**
   * Calculate phrase overlap score
   */
  private calculatePhraseOverlap(text1: string, text2: string): number {
    const text1Lower = text1.toLowerCase();
    const text2Lower = text2.toLowerCase();
    
    // Extract 3-word phrases from text1
    const words1 = text1Lower.split(/\s+/);
    let matchCount = 0;
    let phraseCount = 0;

    for (let i = 0; i < words1.length - 2; i++) {
      const phrase = words1.slice(i, i + 3).join(' ');
      phraseCount++;
      if (text2Lower.includes(phrase)) {
        matchCount++;
      }
    }

    return phraseCount > 0 ? matchCount / phraseCount : 0;
  }

  /**
   * Tokenize text into words for comparison
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2); // Ignore very short words
  }

  /**
   * Determine paragraph status based on attribution score
   */
  private determineStatus(score: number): ParagraphStatus {
    if (score >= ENFORCEMENT_THRESHOLDS.GROUNDED_SIMILARITY) {
      return 'GROUNDED';
    }
    if (score >= ENFORCEMENT_THRESHOLDS.PARTIAL_SIMILARITY) {
      return 'PARTIAL';
    }
    return 'UNGROUNDED';
  }

  /**
   * Determine flags for a paragraph
   */
  private determineFlags(status: ParagraphStatus, text: string): ParagraphFlag[] {
    const flags: ParagraphFlag[] = [];
    
    if (status === 'UNGROUNDED') {
      flags.push('NO_SOURCE');
    }
    if (status === 'PARTIAL') {
      flags.push('LOW_CONFIDENCE');
    }
    
    // Check for placeholder pattern
    if (text.includes('[[PLACEHOLDER:')) {
      flags.push('CONTAINS_PLACEHOLDER');
    }
    
    return flags;
  }

  /**
   * Retrieve fresh chunks for a section
   */
  private async retrieveChunksForSection(
    sectionName: string,
    description: string,
    organizationId: string
  ): Promise<RetrievedChunkForAttribution[]> {
    const query = `${sectionName} ${description}`.trim();
    const embedding = await generateEmbedding(query);
    
    const results = await queryVectors(embedding, organizationId, 10);
    
    return results.map(r => ({
      id: r.id,
      documentId: (r.metadata as any)?.documentId || '',
      documentName: (r.metadata as any)?.filename || 'Unknown',
      documentType: (r.metadata as any)?.documentType || 'OTHER',
      text: (r.metadata as any)?.content || '',
      score: r.score || 0
    }));
  }

  /**
   * Split text into paragraphs
   */
  private splitIntoParagraphs(text: string): string[] {
    // Strip HTML if present
    const plainText = text.replace(/<[^>]*>/g, '\n');
    
    // Split on double newlines or paragraph-like boundaries
    const paragraphs = plainText
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0 && p.split(/\s+/).length >= 3); // At least 3 words
    
    return paragraphs;
  }

  /**
   * Compute section coverage from attributed paragraphs
   */
  private computeSectionCoverage(
    sectionId: string,
    sectionName: string,
    paragraphs: AttributedParagraph[]
  ): SectionCoverage {
    if (paragraphs.length === 0) {
      return this.emptyCoverage(sectionId, sectionName);
    }

    const groundedCount = paragraphs.filter(p => p.status === 'GROUNDED').length;
    const partialCount = paragraphs.filter(p => p.status === 'PARTIAL').length;
    const ungroundedCount = paragraphs.filter(p => p.status === 'UNGROUNDED' || p.status === 'FAILED').length;
    
    // Coverage score: grounded = full credit, partial = half credit
    const coverageScore = Math.round(
      ((groundedCount + partialCount * 0.5) / paragraphs.length) * 100
    );

    // Aggregate source documents
    const docContributions = new Map<string, { 
      documentId: string; 
      documentName: string; 
      documentType: string;
      paragraphsSupported: number 
    }>();

    for (const para of paragraphs) {
      for (const chunk of para.supportingChunks) {
        const existing = docContributions.get(chunk.documentId);
        if (existing) {
          existing.paragraphsSupported++;
        } else {
          docContributions.set(chunk.documentId, {
            documentId: chunk.documentId,
            documentName: chunk.documentName,
            documentType: 'UNKNOWN', // Would need to look up
            paragraphsSupported: 1
          });
        }
      }
    }

    const sourceDocuments: SourceContribution[] = Array.from(docContributions.values())
      .map(d => ({
        ...d,
        contributionPercent: Math.round((d.paragraphsSupported / paragraphs.length) * 100)
      }))
      .sort((a, b) => b.paragraphsSupported - a.paragraphsSupported);

    return {
      sectionId,
      sectionName,
      coverageScore,
      groundedCount,
      partialCount,
      ungroundedCount,
      totalParagraphs: paragraphs.length,
      sourceDocuments,
      computedAt: new Date()
    };
  }

  /**
   * Return empty coverage for sections with no content
   */
  private emptyCoverage(sectionId: string, sectionName: string): SectionCoverage {
    return {
      sectionId,
      sectionName,
      coverageScore: 0,
      groundedCount: 0,
      partialCount: 0,
      ungroundedCount: 0,
      totalParagraphs: 0,
      sourceDocuments: [],
      computedAt: new Date()
    };
  }
}

// Singleton instance
export const citationMapper = new CitationMapper();
