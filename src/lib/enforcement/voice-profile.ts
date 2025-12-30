/**
 * Voice Profile System (AC-3.1 - AC-3.4)
 * 
 * Builds and applies organizational voice profiles:
 * - AC-3.1: Extract preferred terms from >= 3 documents
 * - AC-3.2: Identify banned/avoided terms
 * - AC-3.3: Detect tone characteristics
 * - AC-3.4: Score generated content against voice profile
 */

import prisma from '@/lib/db';
import { getOpenAI } from '@/lib/ai/openai';

// Minimum documents required to build a voice profile
const MIN_DOCS_FOR_PROFILE = 3;

// Terms to always flag as generic/weak
const DEFAULT_BANNED_TERMS = [
  'leverage',
  'synergy',
  'paradigm shift',
  'holistic',
  'best practices',
  'cutting-edge',
  'world-class',
  'state-of-the-art',
  'game-changer',
  'move the needle',
  'low-hanging fruit',
  'circle back',
  'deep dive',
  'bandwidth',
  'pivot',
];

// Common filler phrases that weaken grant writing
const FILLER_PHRASES = [
  'it is important to note that',
  'it should be noted that',
  'it goes without saying',
  'needless to say',
  'in order to',
  'at this point in time',
  'in the event that',
  'due to the fact that',
  'for the purpose of',
];

export interface VoiceProfileData {
  preferredTerms: string[];
  bannedTerms: string[];
  toneDescriptors: string[];
  samplePhrases: Array<{ phrase: string; source: string }>;
}

export interface VoiceScoreResult {
  score: number; // 0-100
  bannedTermsUsed: string[];
  nonPreferredTerms: string[];
  fillerPhrasesUsed: string[];
  suggestions: Array<{
    original: string;
    suggested: string;
    reason: string;
  }>;
}

/**
 * Extract terms and phrases from document text
 */
function extractTermsFromText(text: string): {
  frequentTerms: Map<string, number>;
  phrases: string[];
} {
  const words = text.toLowerCase().split(/\s+/);
  const termCounts = new Map<string, number>();
  
  // Count word frequencies (2+ character words)
  for (const word of words) {
    const cleaned = word.replace(/[^a-z]/g, '');
    if (cleaned.length >= 3) {
      termCounts.set(cleaned, (termCounts.get(cleaned) || 0) + 1);
    }
  }
  
  // Extract notable phrases (3-5 word sequences that appear 2+ times)
  const phrasePattern = /\b([A-Za-z]+(?:\s+[A-Za-z]+){2,4})\b/g;
  const phraseCounts = new Map<string, number>();
  let match;
  
  while ((match = phrasePattern.exec(text)) !== null) {
    const phrase = match[1].toLowerCase();
    phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);
  }
  
  const phrases = Array.from(phraseCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([phrase]) => phrase);
  
  return { frequentTerms: termCounts, phrases };
}

/**
 * Build voice profile from organization's documents
 */
export async function buildVoiceProfile(organizationId: string): Promise<{
  success: boolean;
  profile?: VoiceProfileData;
  error?: string;
}> {
  try {
    // Update status to BUILDING
    await prisma.voiceProfile.upsert({
      where: { organizationId },
      create: {
        organizationId,
        preferredTerms: [],
        bannedTerms: DEFAULT_BANNED_TERMS,
        toneDescriptors: [],
        samplePhrases: [],
        buildStatus: 'BUILDING',
        documentsUsed: 0,
      },
      update: {
        buildStatus: 'BUILDING',
      },
    });

    // Get organization's documents
    const documents = await prisma.document.findMany({
      where: {
        organizationId,
        status: 'INDEXED',
      },
      include: {
        chunks: {
          take: 20, // Sample chunks from each doc
        },
      },
    });

    if (documents.length < MIN_DOCS_FOR_PROFILE) {
      await prisma.voiceProfile.update({
        where: { organizationId },
        data: {
          buildStatus: 'FAILED',
          buildError: `Need at least ${MIN_DOCS_FOR_PROFILE} indexed documents (have ${documents.length})`,
        },
      });
      
      return {
        success: false,
        error: `Need at least ${MIN_DOCS_FOR_PROFILE} indexed documents to build voice profile`,
      };
    }

    // Aggregate text from all documents
    const allText = documents
      .flatMap(d => d.chunks.map(c => c.content))
      .join('\n\n');

    // Extract terms and phrases
    const { frequentTerms, phrases } = extractTermsFromText(allText);

    // Get top 50 most frequent non-common terms
    const commonWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
      'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'were', 'they',
      'their', 'what', 'when', 'your', 'said', 'each', 'she', 'which', 'will',
      'from', 'this', 'that', 'with', 'would', 'there', 'them', 'been', 'have',
      'many', 'some', 'time', 'very', 'into', 'year', 'more', 'other', 'than',
      'program', 'organization', 'community', 'services', 'project', 'provide',
    ]);

    const preferredTerms = Array.from(frequentTerms.entries())
      .filter(([term]) => !commonWords.has(term) && term.length >= 4)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([term]) => term);

    // Use LLM to extract tone descriptors (optional, with fallback)
    let toneDescriptors: string[] = [];
    try {
      const toneResponse = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You analyze writing samples to identify tone characteristics. Return a JSON array of 3-5 tone descriptors (single words like "professional", "warm", "data-driven", "formal", "compassionate").',
          },
          {
            role: 'user',
            content: `Analyze this organization's writing and identify the dominant tone characteristics:\n\n${allText.slice(0, 3000)}\n\nReturn only a JSON array of 3-5 tone descriptors.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 100,
      });

      const toneText = toneResponse.choices[0]?.message?.content || '[]';
      try {
        toneDescriptors = JSON.parse(toneText);
      } catch {
        toneDescriptors = ['professional']; // Fallback
      }
    } catch (error) {
      console.error('Failed to extract tone descriptors:', error);
      toneDescriptors = ['professional']; // Fallback
    }

    // Build sample phrases
    const samplePhrases = phrases.slice(0, 10).map(phrase => ({
      phrase,
      source: 'Extracted from documents',
    }));

    const profile: VoiceProfileData = {
      preferredTerms,
      bannedTerms: DEFAULT_BANNED_TERMS,
      toneDescriptors,
      samplePhrases,
    };

    // Save profile
    await prisma.voiceProfile.update({
      where: { organizationId },
      data: {
        preferredTerms: profile.preferredTerms,
        bannedTerms: profile.bannedTerms,
        toneDescriptors: profile.toneDescriptors,
        samplePhrases: profile.samplePhrases,
        buildStatus: 'READY',
        documentsUsed: documents.length,
        lastBuiltAt: new Date(),
      },
    });

    return { success: true, profile };
  } catch (error) {
    console.error('Voice profile build failed:', error);
    
    await prisma.voiceProfile.update({
      where: { organizationId },
      data: {
        buildStatus: 'FAILED',
        buildError: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to build voice profile',
    };
  }
}

/**
 * Score content against voice profile
 */
export async function scoreContentAgainstVoice(
  content: string,
  organizationId: string
): Promise<VoiceScoreResult> {
  const profile = await prisma.voiceProfile.findUnique({
    where: { organizationId },
  });

  if (!profile || profile.buildStatus !== 'READY') {
    // Return neutral score if no profile
    return {
      score: 100,
      bannedTermsUsed: [],
      nonPreferredTerms: [],
      fillerPhrasesUsed: [],
      suggestions: [],
    };
  }

  const contentLower = content.toLowerCase();
  const bannedTermsUsed: string[] = [];
  const fillerPhrasesUsed: string[] = [];
  const suggestions: VoiceScoreResult['suggestions'] = [];

  // Check for banned terms
  for (const term of profile.bannedTerms) {
    if (contentLower.includes(term.toLowerCase())) {
      bannedTermsUsed.push(term);
      suggestions.push({
        original: term,
        suggested: '[remove or replace with specific language]',
        reason: 'Generic/overused term that weakens grant writing',
      });
    }
  }

  // Check for filler phrases
  for (const phrase of FILLER_PHRASES) {
    if (contentLower.includes(phrase)) {
      fillerPhrasesUsed.push(phrase);
      suggestions.push({
        original: phrase,
        suggested: '[simplify or remove]',
        reason: 'Filler phrase that adds no value',
      });
    }
  }

  // Check for terms that could be replaced with preferred terms
  const nonPreferredTerms: string[] = [];
  const words = contentLower.split(/\s+/);
  const wordSet = new Set(words);
  
  // Simple check: flag if content doesn't use any preferred terms
  const usedPreferred = profile.preferredTerms.filter(term => 
    contentLower.includes(term.toLowerCase())
  );
  
  if (usedPreferred.length === 0 && profile.preferredTerms.length > 0) {
    nonPreferredTerms.push('Content uses none of the organization\'s preferred terminology');
  }

  // Calculate score
  // Start at 100, deduct points for issues
  let score = 100;
  score -= bannedTermsUsed.length * 10; // -10 per banned term
  score -= fillerPhrasesUsed.length * 5; // -5 per filler phrase
  if (usedPreferred.length === 0 && profile.preferredTerms.length > 0) {
    score -= 15; // -15 if no preferred terms used
  }
  
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    bannedTermsUsed,
    nonPreferredTerms,
    fillerPhrasesUsed,
    suggestions,
  };
}

/**
 * Score a section and persist the result
 */
export async function scoreAndPersistSection(
  sectionId: string,
  content: string,
  organizationId: string
): Promise<VoiceScoreResult> {
  const result = await scoreContentAgainstVoice(content, organizationId);
  
  await prisma.voiceScoreRecord.upsert({
    where: { sectionId },
    create: {
      sectionId,
      score: result.score,
      bannedTermsUsed: result.bannedTermsUsed,
      nonPreferredTerms: result.nonPreferredTerms,
      suggestions: result.suggestions,
    },
    update: {
      score: result.score,
      bannedTermsUsed: result.bannedTermsUsed,
      nonPreferredTerms: result.nonPreferredTerms,
      suggestions: result.suggestions,
      computedAt: new Date(),
    },
  });
  
  return result;
}

/**
 * Get voice profile for organization
 */
export async function getVoiceProfile(organizationId: string): Promise<{
  exists: boolean;
  status: string;
  profile?: VoiceProfileData;
  documentsUsed?: number;
  lastBuiltAt?: Date;
  error?: string;
}> {
  const profile = await prisma.voiceProfile.findUnique({
    where: { organizationId },
  });

  if (!profile) {
    return { exists: false, status: 'NOT_BUILT' };
  }

  return {
    exists: true,
    status: profile.buildStatus,
    profile: profile.buildStatus === 'READY' ? {
      preferredTerms: profile.preferredTerms,
      bannedTerms: profile.bannedTerms,
      toneDescriptors: profile.toneDescriptors,
      samplePhrases: profile.samplePhrases as Array<{ phrase: string; source: string }>,
    } : undefined,
    documentsUsed: profile.documentsUsed,
    lastBuiltAt: profile.lastBuiltAt || undefined,
    error: profile.buildError || undefined,
  };
}

/**
 * Update voice profile with custom terms
 */
export async function updateVoiceProfile(
  organizationId: string,
  updates: {
    preferredTerms?: string[];
    bannedTerms?: string[];
  }
): Promise<void> {
  await prisma.voiceProfile.update({
    where: { organizationId },
    data: {
      ...(updates.preferredTerms && { preferredTerms: updates.preferredTerms }),
      ...(updates.bannedTerms && { bannedTerms: updates.bannedTerms }),
      updatedAt: new Date(),
    },
  });
}
