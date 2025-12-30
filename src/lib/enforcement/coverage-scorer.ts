/**
 * Coverage Scorer
 * 
 * Computes per-section and overall proposal coverage scores.
 * Aggregates data from CitationMapper.
 */

import prisma from '@/lib/db';
import { 
  SectionCoverage, 
  ProposalCoverage 
} from '@/types/enforcement';
import { citationMapper } from './citation-mapper';

export class CoverageScorer {
  /**
   * Compute proposal-level coverage from stored section coverage
   */
  async computeProposalCoverage(proposalId: string): Promise<ProposalCoverage> {
    const sections = await prisma.proposalSection.findMany({
      where: { proposalId },
      include: {
        coverageRecord: true
      },
      orderBy: { order: 'asc' }
    });

    const sectionScores: SectionCoverage[] = sections
      .filter(s => s.coverageRecord)
      .map(s => ({
        sectionId: s.id,
        sectionName: s.sectionName,
        coverageScore: s.coverageRecord!.coverageScore,
        groundedCount: s.coverageRecord!.groundedCount,
        partialCount: s.coverageRecord!.partialCount,
        ungroundedCount: s.coverageRecord!.ungroundedCount,
        totalParagraphs: s.coverageRecord!.totalParagraphs,
        sourceDocuments: s.coverageRecord!.sourceDocuments as any[],
        computedAt: s.coverageRecord!.computedAt
      }));

    if (sectionScores.length === 0) {
      return this.emptyCoverage(proposalId);
    }

    const totalParagraphs = sectionScores.reduce((sum, s) => sum + s.totalParagraphs, 0);
    const groundedParagraphs = sectionScores.reduce(
      (sum, s) => sum + s.groundedCount + s.partialCount * 0.5, 
      0
    );
    
    const overallScore = totalParagraphs > 0 
      ? Math.round((groundedParagraphs / totalParagraphs) * 100)
      : 0;

    // Find lowest section
    const lowestSection = sectionScores.length > 0
      ? sectionScores.reduce((min, s) => 
          s.coverageScore < min.score ? { name: s.sectionName, score: s.coverageScore } : min,
          { name: sectionScores[0].sectionName, score: sectionScores[0].coverageScore }
        )
      : null;

    // Count unique documents
    const allDocs = new Set<string>();
    sectionScores.forEach(s => {
      (s.sourceDocuments || []).forEach((d: any) => allDocs.add(d.documentId));
    });

    return {
      proposalId,
      overallScore,
      sectionScores,
      lowestSection,
      documentsUsed: allDocs.size,
      totalParagraphs,
      groundedParagraphs: Math.round(groundedParagraphs),
      computedAt: new Date()
    };
  }

  /**
   * Recompute coverage for all sections in a proposal
   */
  async recomputeAllSections(proposalId: string, organizationId: string): Promise<ProposalCoverage> {
    const sections = await prisma.proposalSection.findMany({
      where: { proposalId },
      orderBy: { order: 'asc' }
    });

    for (const section of sections) {
      if (section.content && section.content.trim().length > 0) {
        try {
          await citationMapper.mapAndPersist({
            sectionId: section.id,
            generatedText: section.content,
            retrievedChunks: [], // Will fetch fresh
            organizationId
          });
        } catch (error) {
          console.error(`Failed to compute coverage for section ${section.id}:`, error);
        }
      }
    }

    return this.computeProposalCoverage(proposalId);
  }

  /**
   * Get coverage for a single section
   */
  async getSectionCoverage(sectionId: string): Promise<SectionCoverage | null> {
    const record = await prisma.sectionCoverageRecord.findUnique({
      where: { sectionId },
      include: {
        section: {
          select: { sectionName: true }
        }
      }
    });

    if (!record) {
      return null;
    }

    return {
      sectionId: record.sectionId,
      sectionName: record.section.sectionName,
      coverageScore: record.coverageScore,
      groundedCount: record.groundedCount,
      partialCount: record.partialCount,
      ungroundedCount: record.ungroundedCount,
      totalParagraphs: record.totalParagraphs,
      sourceDocuments: record.sourceDocuments as any[],
      computedAt: record.computedAt
    };
  }

  /**
   * Check if coverage exists for a proposal
   */
  async hasCoverage(proposalId: string): Promise<boolean> {
    const count = await prisma.sectionCoverageRecord.count({
      where: {
        section: {
          proposalId
        }
      }
    });
    return count > 0;
  }

  /**
   * Return empty coverage
   */
  private emptyCoverage(proposalId: string): ProposalCoverage {
    return {
      proposalId,
      overallScore: 0,
      sectionScores: [],
      lowestSection: null,
      documentsUsed: 0,
      totalParagraphs: 0,
      groundedParagraphs: 0,
      computedAt: new Date()
    };
  }
}

// Singleton instance
export const coverageScorer = new CoverageScorer();
