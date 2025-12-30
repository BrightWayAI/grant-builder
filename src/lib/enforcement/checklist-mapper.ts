/**
 * Checklist Mapper (AC-2.1, AC-2.2)
 * 
 * Manages RFP checklist items and their mapping to proposal sections.
 * - Creates checklist items from parsed RFP requirements
 * - Auto-maps sections to checklist items based on name similarity
 * - Validates checklist completion for export
 */

import prisma from '@/lib/db';

export interface ChecklistItemInput {
  name: string;
  description?: string;
  isRequired?: boolean;
  wordLimit?: number;
  charLimit?: number;
  pageLimit?: number;
  pointValue?: number;
  parserConfidence?: number;
}

export interface ChecklistMappingResult {
  checklistItemId: string;
  sectionId: string;
  confidence: number;
  mappingType: 'AUTO' | 'MANUAL';
}

export interface ChecklistValidationResult {
  valid: boolean;
  missingRequired: string[];
  unmappedItems: string[];
  lowConfidenceMappings: Array<{
    itemName: string;
    sectionName: string;
    confidence: number;
  }>;
}

/**
 * Calculate similarity between two strings using Jaccard index
 */
function calculateSimilarity(str1: string, str2: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const words1 = new Set(normalize(str1));
  const words2 = new Set(normalize(str2));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set(Array.from(words1).filter(w => words2.has(w)));
  const union = new Set([...Array.from(words1), ...Array.from(words2)]);
  
  return intersection.size / union.size;
}

/**
 * Common section name aliases for better matching
 */
const SECTION_ALIASES: Record<string, string[]> = {
  'executive summary': ['summary', 'overview', 'abstract'],
  'statement of need': ['need statement', 'problem statement', 'needs assessment', 'community need'],
  'project description': ['project narrative', 'methodology', 'approach', 'methods', 'program description'],
  'goals and objectives': ['goals', 'objectives', 'outcomes', 'expected outcomes'],
  'evaluation plan': ['evaluation', 'assessment', 'measurement', 'metrics'],
  'organizational background': ['organization background', 'org background', 'about us', 'organizational capacity'],
  'budget narrative': ['budget justification', 'budget explanation', 'budget description'],
  'sustainability plan': ['sustainability', 'future funding', 'continuation plan'],
  'timeline': ['project timeline', 'schedule', 'work plan', 'implementation timeline'],
};

/**
 * Get expanded names for a section name including aliases
 */
function getExpandedNames(name: string): string[] {
  const normalized = name.toLowerCase();
  const names = [normalized];
  
  for (const [key, aliases] of Object.entries(SECTION_ALIASES)) {
    if (normalized.includes(key) || aliases.some(a => normalized.includes(a))) {
      names.push(key, ...aliases);
    }
  }
  
  return names;
}

/**
 * Create checklist items from parsed RFP requirements
 */
export async function createChecklistFromRFP(
  proposalId: string,
  items: ChecklistItemInput[]
): Promise<string[]> {
  const createdIds: string[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const created = await prisma.checklistItem.create({
      data: {
        proposalId,
        name: item.name,
        description: item.description,
        isRequired: item.isRequired ?? true,
        wordLimit: item.wordLimit,
        charLimit: item.charLimit,
        pageLimit: item.pageLimit,
        pointValue: item.pointValue,
        parserConfidence: item.parserConfidence,
        order: i,
      },
    });
    createdIds.push(created.id);
  }
  
  return createdIds;
}

/**
 * Auto-map proposal sections to checklist items based on name similarity
 */
export async function autoMapSectionsToChecklist(
  proposalId: string
): Promise<ChecklistMappingResult[]> {
  const [checklistItems, sections] = await Promise.all([
    prisma.checklistItem.findMany({
      where: { proposalId },
      include: { sectionMappings: true },
    }),
    prisma.proposalSection.findMany({
      where: { proposalId },
    }),
  ]);
  
  const results: ChecklistMappingResult[] = [];
  const MIN_CONFIDENCE = 0.3;
  
  for (const item of checklistItems) {
    // Skip if already has manual mapping
    if (item.sectionMappings.some(m => m.mappingType === 'MANUAL')) {
      continue;
    }
    
    const itemNames = getExpandedNames(item.name);
    let bestMatch: { sectionId: string; confidence: number } | null = null;
    
    for (const section of sections) {
      const sectionNames = getExpandedNames(section.sectionName);
      
      // Calculate best similarity across all name combinations
      let maxSimilarity = 0;
      for (const itemName of itemNames) {
        for (const sectionName of sectionNames) {
          const similarity = calculateSimilarity(itemName, sectionName);
          maxSimilarity = Math.max(maxSimilarity, similarity);
        }
      }
      
      if (maxSimilarity > MIN_CONFIDENCE && (!bestMatch || maxSimilarity > bestMatch.confidence)) {
        bestMatch = { sectionId: section.id, confidence: maxSimilarity };
      }
    }
    
    if (bestMatch) {
      // Check if mapping already exists
      const existingMapping = await prisma.checklistSectionMapping.findFirst({
        where: {
          checklistItemId: item.id,
          sectionId: bestMatch.sectionId,
        },
      });
      
      if (!existingMapping) {
        await prisma.checklistSectionMapping.create({
          data: {
            checklistItemId: item.id,
            sectionId: bestMatch.sectionId,
            mappingType: 'AUTO',
            confidence: bestMatch.confidence,
          },
        });
      }
      
      results.push({
        checklistItemId: item.id,
        sectionId: bestMatch.sectionId,
        confidence: bestMatch.confidence,
        mappingType: 'AUTO',
      });
    }
  }
  
  return results;
}

/**
 * Manually map a section to a checklist item
 */
export async function manualMapSectionToChecklist(
  checklistItemId: string,
  sectionId: string
): Promise<void> {
  // Remove any existing auto mappings for this item
  await prisma.checklistSectionMapping.deleteMany({
    where: {
      checklistItemId,
      mappingType: 'AUTO',
    },
  });
  
  // Create manual mapping
  await prisma.checklistSectionMapping.upsert({
    where: {
      checklistItemId_sectionId: {
        checklistItemId,
        sectionId,
      },
    },
    create: {
      checklistItemId,
      sectionId,
      mappingType: 'MANUAL',
      confidence: 1.0,
    },
    update: {
      mappingType: 'MANUAL',
      confidence: 1.0,
    },
  });
}

/**
 * Validate checklist completion for export
 */
export async function validateChecklistCompletion(
  proposalId: string
): Promise<ChecklistValidationResult> {
  const checklistItems = await prisma.checklistItem.findMany({
    where: { proposalId },
    include: {
      sectionMappings: {
        include: {
          // We need to check section content, but ChecklistSectionMapping doesn't have section relation
          // So we'll fetch sections separately
        },
      },
    },
  });
  
  const sections = await prisma.proposalSection.findMany({
    where: { proposalId },
  });
  
  const sectionMap = new Map(sections.map(s => [s.id, s]));
  
  const missingRequired: string[] = [];
  const unmappedItems: string[] = [];
  const lowConfidenceMappings: Array<{
    itemName: string;
    sectionName: string;
    confidence: number;
  }> = [];
  
  for (const item of checklistItems) {
    const mappings = item.sectionMappings;
    
    if (mappings.length === 0) {
      unmappedItems.push(item.name);
      if (item.isRequired) {
        missingRequired.push(item.name);
      }
      continue;
    }
    
    // Check if any mapped section has content
    let hasContent = false;
    for (const mapping of mappings) {
      const section = sectionMap.get(mapping.sectionId);
      if (section && section.content.trim().length > 0) {
        hasContent = true;
        
        // Check for low confidence auto mappings
        if (mapping.mappingType === 'AUTO' && mapping.confidence && mapping.confidence < 0.6) {
          lowConfidenceMappings.push({
            itemName: item.name,
            sectionName: section.sectionName,
            confidence: mapping.confidence,
          });
        }
      }
    }
    
    if (!hasContent && item.isRequired) {
      missingRequired.push(item.name);
    }
  }
  
  return {
    valid: missingRequired.length === 0,
    missingRequired,
    unmappedItems,
    lowConfidenceMappings,
  };
}

/**
 * Get checklist status for a proposal
 */
export async function getChecklistStatus(proposalId: string): Promise<{
  items: Array<{
    id: string;
    name: string;
    isRequired: boolean;
    status: 'COMPLETE' | 'INCOMPLETE' | 'UNMAPPED' | 'NEEDS_REVIEW';
    mappedSections: Array<{
      id: string;
      name: string;
      hasContent: boolean;
      confidence: number | null;
    }>;
  }>;
  summary: {
    total: number;
    complete: number;
    incomplete: number;
    needsReview: number;
  };
}> {
  const checklistItems = await prisma.checklistItem.findMany({
    where: { proposalId },
    include: { sectionMappings: true },
    orderBy: { order: 'asc' },
  });
  
  const sections = await prisma.proposalSection.findMany({
    where: { proposalId },
  });
  
  const sectionMap = new Map(sections.map(s => [s.id, s]));
  
  const items = checklistItems.map(item => {
    const mappedSections = item.sectionMappings.map(m => {
      const section = sectionMap.get(m.sectionId);
      return {
        id: m.sectionId,
        name: section?.sectionName || 'Unknown',
        hasContent: section ? section.content.trim().length > 0 : false,
        confidence: m.confidence,
      };
    });
    
    let status: 'COMPLETE' | 'INCOMPLETE' | 'UNMAPPED' | 'NEEDS_REVIEW';
    
    if (mappedSections.length === 0) {
      status = 'UNMAPPED';
    } else if (mappedSections.some(s => s.confidence !== null && s.confidence < 0.6)) {
      status = 'NEEDS_REVIEW';
    } else if (mappedSections.some(s => s.hasContent)) {
      status = 'COMPLETE';
    } else {
      status = 'INCOMPLETE';
    }
    
    return {
      id: item.id,
      name: item.name,
      isRequired: item.isRequired,
      status,
      mappedSections,
    };
  });
  
  return {
    items,
    summary: {
      total: items.length,
      complete: items.filter(i => i.status === 'COMPLETE').length,
      incomplete: items.filter(i => i.status === 'INCOMPLETE' || i.status === 'UNMAPPED').length,
      needsReview: items.filter(i => i.status === 'NEEDS_REVIEW').length,
    },
  };
}
