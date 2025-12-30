/**
 * Placeholder Detector
 * 
 * Detects and persists placeholders in section content.
 * Placeholders are marked as: [[PLACEHOLDER:TYPE:DESCRIPTION:ID]]
 * 
 * Types:
 * - MISSING_DATA: Data needed but not available (blocks export)
 * - USER_INPUT_REQUIRED: User must provide specific info (blocks export)
 * - VERIFICATION_NEEDED: Should be verified but can proceed (warns)
 */

import prisma from '@/lib/db';
import { 
  Placeholder, 
  PlaceholderSummary,
  PlaceholderType,
  PLACEHOLDER_REGEX,
  LEGACY_PLACEHOLDER_REGEX
} from '@/types/enforcement';
import { generateId } from '@/lib/utils';

export class PlaceholderDetector {
  /**
   * Detect placeholders in content and return matches
   * Supports both enforced format [[PLACEHOLDER:TYPE:DESC:ID]] and legacy [PLACEHOLDER: desc]
   */
  detectPlaceholders(content: string): Omit<Placeholder, 'sectionId'>[] {
    const placeholders: Omit<Placeholder, 'sectionId'>[] = [];
    const foundPositions = new Set<number>();
    
    // 1. Detect enforced format: [[PLACEHOLDER:TYPE:DESCRIPTION:ID]]
    const enforcedRegex = new RegExp(PLACEHOLDER_REGEX.source, 'g');
    let match;
    
    while ((match = enforcedRegex.exec(content)) !== null) {
      const [fullMatch, type, description, id] = match;
      foundPositions.add(match.index);
      
      placeholders.push({
        id: id === 'auto' ? generateId() : id,
        type: type as PlaceholderType,
        description: description.trim(),
        suggestedSources: this.getSuggestedSources(type as PlaceholderType, description),
        position: {
          start: match.index,
          end: match.index + fullMatch.length
        },
        resolved: false
      });
    }
    
    // 2. Detect legacy LLM format: [PLACEHOLDER: description]
    // Convert to MISSING_DATA type for blocking
    // BUT skip if it's inside a double-bracket enforced placeholder
    const legacyRegex = new RegExp(LEGACY_PLACEHOLDER_REGEX.source, 'g');
    
    while ((match = legacyRegex.exec(content)) !== null) {
      // Skip if this is part of an enforced placeholder (preceded by '[')
      if (match.index > 0 && content[match.index - 1] === '[') {
        continue;
      }
      
      const [fullMatch, description] = match;
      
      placeholders.push({
        id: generateId(),
        type: 'MISSING_DATA', // Legacy placeholders are treated as missing data
        description: description.trim(),
        suggestedSources: this.getSuggestedSources('MISSING_DATA', description),
        position: {
          start: match.index,
          end: match.index + fullMatch.length
        },
        resolved: false
      });
    }
    
    return placeholders;
  }

  /**
   * Check if content has any placeholders (either format)
   */
  hasPlaceholders(content: string): boolean {
    const enforcedRegex = new RegExp(PLACEHOLDER_REGEX.source, 'g');
    const legacyRegex = new RegExp(LEGACY_PLACEHOLDER_REGEX.source, 'g');
    return enforcedRegex.test(content) || legacyRegex.test(content);
  }

  /**
   * Count unresolved placeholders that block export
   */
  countBlockingPlaceholders(content: string): number {
    const placeholders = this.detectPlaceholders(content);
    return placeholders.filter(p => 
      p.type === 'MISSING_DATA' || p.type === 'USER_INPUT_REQUIRED'
    ).length;
  }

  /**
   * Scan all sections of a proposal and persist placeholder records
   */
  async scanAndPersistPlaceholders(proposalId: string): Promise<PlaceholderSummary> {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { sections: true }
    });

    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    const allPlaceholders: Placeholder[] = [];

    for (const section of proposal.sections) {
      const detected = this.detectPlaceholders(section.content);
      
      // Delete existing placeholders for this section and re-create
      await prisma.placeholderRecord.deleteMany({
        where: { sectionId: section.id }
      });

      for (const placeholder of detected) {
        const record = await prisma.placeholderRecord.create({
          data: {
            sectionId: section.id,
            placeholderType: placeholder.type,
            description: placeholder.description,
            suggestedSources: placeholder.suggestedSources,
            positionStart: placeholder.position.start,
            positionEnd: placeholder.position.end,
            resolved: false
          }
        });

        allPlaceholders.push({
          ...placeholder,
          id: record.id,
          sectionId: section.id
        });
      }
    }

    return this.buildSummary(proposalId, allPlaceholders);
  }

  /**
   * Get placeholder summary for a proposal from database
   */
  async getPlaceholderSummary(proposalId: string): Promise<PlaceholderSummary> {
    const records = await prisma.placeholderRecord.findMany({
      where: {
        section: {
          proposalId
        }
      },
      include: {
        section: {
          select: { id: true }
        }
      }
    });

    const placeholders: Placeholder[] = records.map(r => ({
      id: r.id,
      sectionId: r.sectionId,
      type: r.placeholderType as PlaceholderType,
      description: r.description,
      suggestedSources: r.suggestedSources,
      position: {
        start: r.positionStart,
        end: r.positionEnd
      },
      resolved: r.resolved,
      resolvedContent: r.resolvedContent || undefined,
      resolvedAt: r.resolvedAt || undefined
    }));

    return this.buildSummary(proposalId, placeholders);
  }

  /**
   * Get unresolved placeholders that block export
   */
  async getBlockingPlaceholders(proposalId: string): Promise<Placeholder[]> {
    const records = await prisma.placeholderRecord.findMany({
      where: {
        section: {
          proposalId
        },
        resolved: false,
        placeholderType: {
          in: ['MISSING_DATA', 'USER_INPUT_REQUIRED']
        }
      }
    });

    return records.map(r => ({
      id: r.id,
      sectionId: r.sectionId,
      type: r.placeholderType as PlaceholderType,
      description: r.description,
      suggestedSources: r.suggestedSources,
      position: {
        start: r.positionStart,
        end: r.positionEnd
      },
      resolved: r.resolved
    }));
  }

  /**
   * Resolve a placeholder
   */
  async resolvePlaceholder(
    placeholderId: string, 
    resolvedContent: string
  ): Promise<void> {
    await prisma.placeholderRecord.update({
      where: { id: placeholderId },
      data: {
        resolved: true,
        resolvedContent,
        resolvedAt: new Date()
      }
    });
  }

  /**
   * Create a placeholder string to insert into content
   */
  static createPlaceholder(
    type: PlaceholderType, 
    description: string,
    id?: string
  ): string {
    const placeholderId = id || generateId();
    return `[[PLACEHOLDER:${type}:${description}:${placeholderId}]]`;
  }

  /**
   * Get suggested document sources based on placeholder type and description
   */
  private getSuggestedSources(type: PlaceholderType, description: string): string[] {
    const descLower = description.toLowerCase();
    const suggestions: string[] = [];

    if (descLower.includes('budget') || descLower.includes('financial')) {
      suggestions.push('AUDITED_FINANCIALS', 'FORM_990');
    }
    if (descLower.includes('outcome') || descLower.includes('impact') || descLower.includes('result')) {
      suggestions.push('IMPACT_REPORT', 'EVALUATION_REPORT');
    }
    if (descLower.includes('staff') || descLower.includes('team')) {
      suggestions.push('STAFF_BIOS');
    }
    if (descLower.includes('program') || descLower.includes('service')) {
      suggestions.push('PROGRAM_DESCRIPTION');
    }
    if (descLower.includes('organization') || descLower.includes('history') || descLower.includes('mission')) {
      suggestions.push('ORG_OVERVIEW', 'ANNUAL_REPORT');
    }

    // Default suggestions if none matched
    if (suggestions.length === 0) {
      if (type === 'MISSING_DATA') {
        suggestions.push('ANNUAL_REPORT', 'ORG_OVERVIEW');
      } else {
        suggestions.push('PROPOSAL', 'PROGRAM_DESCRIPTION');
      }
    }

    return suggestions;
  }

  /**
   * Build summary from placeholder list
   */
  private buildSummary(proposalId: string, placeholders: Placeholder[]): PlaceholderSummary {
    const byType: Record<PlaceholderType, number> = {
      'MISSING_DATA': 0,
      'USER_INPUT_REQUIRED': 0,
      'VERIFICATION_NEEDED': 0
    };

    for (const p of placeholders) {
      if (!p.resolved) {
        byType[p.type]++;
      }
    }

    const unresolved = placeholders.filter(p => !p.resolved).length;

    return {
      proposalId,
      total: placeholders.length,
      unresolved,
      byType,
      placeholders
    };
  }
}

// Singleton instance
export const placeholderDetector = new PlaceholderDetector();
