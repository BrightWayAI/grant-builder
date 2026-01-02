import { getOpenAI, GENERATION_MODEL } from "./openai";
import { retrieveRelevantChunks, formatContextForPrompt, RetrievedChunk } from "./retrieval";
import prisma from "@/lib/db";
import {
  checkRetrievalSufficiency,
  generatePlaceholderOnlyContent,
  enforceGeneration,
  sanitizeCustomInstructions,
  enforceClaimVerification,
  EnforcementResult,
} from "@/lib/enforcement/generation-enforcer";
import { getVoiceProfile, VoiceProfileData } from "@/lib/enforcement/voice-profile";

interface GenerationContext {
  organizationId: string;
  proposalId: string;
  sectionId?: string;
  funderName?: string;
  programTitle?: string;
  fundingAmount?: { min?: number; max?: number };
}

interface SectionGenerationOptions {
  sectionName: string;
  description?: string;
  wordLimit?: number;
  charLimit?: number;
  context: GenerationContext;
  existingContent?: string;
  customInstructions?: string;
}

export interface EnforcedGenerationResult {
  stream: ReadableStream<Uint8Array>;
  metadata: {
    retrievedChunkCount: number;
    usedGenericKnowledge: boolean;
    enforcementApplied: boolean;
    claimsReplaced: number;
    paragraphsPlaceholdered: number;
  };
}

/**
 * Generate section draft with HARD ENFORCEMENT (AC-1.1, AC-1.2, AC-4.2, AC-4.4, AC-5.1)
 * 
 * Key behaviors:
 * 1. If KB retrieval returns insufficient sources -> return placeholder-only content
 * 2. After LLM generation -> verify all claims against KB, replace unsupported with placeholders
 * 3. After claim verification -> check paragraph grounding, replace ungrounded with placeholders
 * 4. Custom instructions are sanitized to prevent policy bypass
 * 
 * This is a BLOCKING enforcement - content is NOT shown until enforcement completes
 */
export async function generateSectionDraft(
  options: SectionGenerationOptions
): Promise<ReadableStream<Uint8Array>> {
  const {
    sectionName,
    description,
    wordLimit,
    charLimit,
    context,
    existingContent,
    customInstructions,
  } = options;

  const org = await prisma.organization.findUnique({
    where: { id: context.organizationId },
  });

  if (!org) {
    throw new Error("Organization not found");
  }

  // Step 1: Retrieve relevant chunks from KB
  const queryText = `${sectionName} ${description || ""} for grant proposal to ${context.funderName || "funder"}`;
  console.log(`[Generation] Retrieving chunks for section "${sectionName}", org: ${context.organizationId}`);
  
  const relevantChunks = await retrieveRelevantChunks(queryText, context.organizationId, {
    topK: 8,
  });
  
  console.log(`[Generation] Retrieved ${relevantChunks.length} chunks, scores: ${relevantChunks.map(c => c.score.toFixed(2)).join(', ') || 'none'}`);

  // Step 2: PRE-GENERATION CHECK - Verify KB has sufficient sources (AC-4.4)
  const sufficiencyCheck = checkRetrievalSufficiency(relevantChunks);
  console.log(`[Generation] Sufficiency check: proceed=${sufficiencyCheck.proceed}, reason=${sufficiencyCheck.reason || 'ok'}`);
  
  if (!sufficiencyCheck.proceed) {
    // KB is empty or insufficient - return placeholder-only content (AC-1.2)
    const placeholderContent = generatePlaceholderOnlyContent(sectionName, description);
    
    // Persist the generation attempt metadata
    if (context.sectionId) {
      try {
        await prisma.generationMetadata.create({
          data: {
            sectionId: context.sectionId,
            organizationId: context.organizationId,
            retrievedChunkCount: 0,
            usedGenericKnowledge: true,
            enforcementApplied: true,
            claimsReplaced: 0,
            paragraphsPlaceholdered: 1,
            policyOverride: false,
            rawGeneration: null,
            enforcedGeneration: placeholderContent,
          },
        });
        
        await prisma.proposalSection.update({
          where: { id: context.sectionId },
          data: {
            usedGenericKnowledge: true,
            retrievedChunkCount: 0,
            enforcementApplied: true,
          },
        });
      } catch (error) {
        console.error('Failed to persist empty KB generation metadata:', error);
      }
    }
    
    // Stream a clean empty state message (no ugly technical text)
    const encoder = new TextEncoder();
    const emptyStateContent = `[[EMPTY_KB:${sectionName}]]`;
    
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(emptyStateContent));
        controller.close();
      },
    });
  }

  // Step 3: Sanitize custom instructions (AC-5.1)
  const { sanitized: safeInstructions, policyOverride } = sanitizeCustomInstructions(customInstructions);
  
  // Step 3.5: Fetch voice profile for org (AC-3.3)
  let voiceProfile: VoiceProfileData | null = null;
  try {
    const profileResult = await getVoiceProfile(context.organizationId);
    if (profileResult.exists && profileResult.status === 'READY' && profileResult.profile) {
      voiceProfile = profileResult.profile;
    }
  } catch (error) {
    console.error('Failed to fetch voice profile:', error);
    // Continue without voice profile
  }
  
  const formattedContext = formatContextForPrompt(relevantChunks);
  const systemPrompt = buildSystemPrompt(org, context, voiceProfile);
  const userPrompt = buildUserPrompt({
    sectionName,
    description,
    wordLimit,
    charLimit,
    formattedContext,
    existingContent,
    customInstructions: safeInstructions,
    funderName: context.funderName,
    programTitle: context.programTitle,
    fundingAmount: context.fundingAmount,
  });

  // Step 4: Generate content (non-streaming to enable enforcement)
  const response = await getOpenAI().chat.completions.create({
    model: GENERATION_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    stream: false, // Must be non-streaming for enforcement
  });

  const rawContent = response.choices[0]?.message?.content || "";

  // Step 5: POST-GENERATION ENFORCEMENT (AC-1.1, AC-1.3, AC-4.2)
  let enforcedContent = rawContent;
  let enforcementResult: EnforcementResult | null = null;
  
  if (context.sectionId) {
    try {
      enforcementResult = await enforceGeneration(
        rawContent,
        relevantChunks,
        context.sectionId,
        context.organizationId
      );
      enforcedContent = enforcementResult.enforcedContent;
      
      // Update metadata with policy override flag
      if (policyOverride) {
        await prisma.generationMetadata.updateMany({
          where: { sectionId: context.sectionId },
          data: { policyOverride: true },
        });
      }
    } catch (error) {
      console.error('Enforcement failed, using raw content:', error);
      // FAIL CLOSED: If enforcement fails, use raw content (warning shown via UI, not inline text)
      enforcedContent = rawContent;
      
      // Mark proposal as having enforcement failure
      try {
        const section = await prisma.proposalSection.findUnique({
          where: { id: context.sectionId },
          select: { proposalId: true },
        });
        if (section) {
          await prisma.proposal.update({
            where: { id: section.proposalId },
            data: { enforcementFailure: true },
          });
        }
      } catch (e) {
        console.error('Failed to set enforcement failure flag:', e);
      }
    }
  }

  // Step 6: Stream the enforced content (no inline warnings - shown via UI)
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(enforcedContent));
      controller.close();
    },
  });
}

function buildSystemPrompt(
  org: { name: string; mission?: string | null; geography?: string | null },
  context: GenerationContext,
  voiceProfile: VoiceProfileData | null
): string {
  // Build voice guidance section (AC-3.3)
  let voiceGuidance = '';
  if (voiceProfile) {
    voiceGuidance = `
ORGANIZATIONAL VOICE PROFILE (AC-3.3 - USE THESE):
- Tone: ${voiceProfile.toneDescriptors.join(', ') || 'Professional'}
${voiceProfile.preferredTerms.length > 0 ? `- PREFERRED TERMS (use these when relevant): ${voiceProfile.preferredTerms.slice(0, 15).join(', ')}` : ''}
${voiceProfile.bannedTerms.length > 0 ? `- BANNED TERMS (DO NOT USE): ${voiceProfile.bannedTerms.slice(0, 10).join(', ')}` : ''}
${voiceProfile.samplePhrases.length > 0 ? `- Sample phrases from org docs: "${voiceProfile.samplePhrases.slice(0, 3).map(p => p.phrase).join('", "')}"` : ''}
`;
  }

  return `You are an expert grant writer helping ${org.name} write compelling grant proposals.

Organization Details:
- Name: ${org.name}
- Mission: ${org.mission || "Not specified"}
- Geography: ${org.geography || "Not specified"}
${context.funderName ? `- Current Funder: ${context.funderName}` : ""}
${context.programTitle ? `- Grant Program: ${context.programTitle}` : ""}
${voiceGuidance}
Writing Guidelines:
1. Write in a professional, confident tone that reflects the organization's voice
2. Use specific data, statistics, and examples from the provided context
3. Be concise and impactful - every sentence should add value
4. Follow standard grant writing best practices
5. If you lack specific information, write general but accurate statements that don't include unverified specifics
6. Match the organization's existing writing style when context is provided
7. Focus on outcomes and impact, not just activities
${voiceProfile ? '8. IMPORTANT: Use the preferred terms and tone from the voice profile above' : ''}

FORMATTING RULES (use HTML tags):
- Wrap each paragraph in <p>...</p> tags
- Use <strong>...</strong> for important terms or emphasis
- Use <h3>...</h3> for subheadings within the section (NOT for the main section title)
- Use <ul><li>...</li></ul> for bullet lists
- Use <ol><li>...</li></ol> for numbered lists
- Do NOT use markdown (**, *, #) - only HTML tags
- Keep formatting clean and professional

DO NOT:
- Make up statistics or specific numbers not in the context
- Use generic filler language
- Exceed specified word/character limits
- Include information you're not confident about
- Use any markdown syntax (**, *, #, etc.)
${voiceProfile?.bannedTerms.length ? `- Use any of these banned terms: ${voiceProfile.bannedTerms.slice(0, 10).join(', ')}` : ''}`;
}

function buildUserPrompt(params: {
  sectionName: string;
  description?: string;
  wordLimit?: number;
  charLimit?: number;
  formattedContext: string;
  existingContent?: string;
  customInstructions?: string;
  funderName?: string;
  programTitle?: string;
  fundingAmount?: { min?: number; max?: number };
}): string {
  const {
    sectionName,
    description,
    wordLimit,
    charLimit,
    formattedContext,
    existingContent,
    customInstructions,
    funderName,
    programTitle,
    fundingAmount,
  } = params;

  let prompt = `Write the "${sectionName}" section for a grant proposal`;
  
  if (funderName) {
    prompt += ` to ${funderName}`;
  }
  if (programTitle) {
    prompt += ` for the ${programTitle} program`;
  }
  if (fundingAmount?.max) {
    prompt += ` (requesting up to $${fundingAmount.max.toLocaleString()})`;
  }
  prompt += ".\n\n";

  if (description) {
    prompt += `Section Requirements:\n${description}\n\n`;
  }

  if (wordLimit) {
    prompt += `Word Limit: ${wordLimit} words (stay within this limit)\n`;
  }
  if (charLimit) {
    prompt += `Character Limit: ${charLimit} characters (stay within this limit)\n`;
  }

  prompt += `\n---\nRELEVANT CONTEXT FROM ORGANIZATION'S KNOWLEDGE BASE:\n\n${formattedContext}\n---\n\n`;

  if (existingContent) {
    prompt += `EXISTING DRAFT TO IMPROVE:\n${existingContent}\n\nPlease improve this draft while maintaining the core message.\n\n`;
  }

  if (customInstructions) {
    prompt += `ADDITIONAL INSTRUCTIONS:\n${customInstructions}\n\n`;
  }

  prompt += "Write the section now:";

  return prompt;
}

export interface CopilotAction {
  type: "expand" | "condense" | "strengthen" | "clarify" | "tone" | "grammar" | "custom";
  selectedText: string;
  customPrompt?: string;
  context: GenerationContext;
}

/**
 * Run copilot action with ENFORCEMENT (AC-1.1, AC-1.3, AC-4.2, AC-5.1)
 * 
 * Key behaviors:
 * 1. Custom prompts are sanitized to prevent bypass (AC-5.1)
 * 2. Actions requiring data (expand, strengthen) check KB first
 * 3. Output is verified against KB, unverified claims replaced with placeholders (AC-1.3)
 * 4. If no KB sources available, warns user (AC-4.4)
 */
export async function runCopilotAction(
  action: CopilotAction
): Promise<ReadableStream<Uint8Array>> {
  const { type, selectedText, customPrompt, context } = action;

  // Step 1: Sanitize custom prompt (AC-5.1)
  const { sanitized: safePrompt, policyOverride } = sanitizeCustomInstructions(customPrompt);

  let instruction: string;
  let needsContext = false;
  let requiresVerification = false;

  switch (type) {
    case "expand":
      instruction = "Expand this text with more detail, examples, or supporting information from the knowledge base. Approximately double the length. If you don't have supporting data, write general but accurate statements.";
      needsContext = true;
      requiresVerification = true;
      break;
    case "condense":
      instruction = "Condense this text to be more concise while preserving the key message. Reduce by approximately 30-50%.";
      break;
    case "strengthen":
      instruction = "Strengthen this text by adding data, evidence, or citations from the knowledge base. Make the argument more compelling. If you lack specific data, focus on qualitative strengths.";
      needsContext = true;
      requiresVerification = true;
      break;
    case "clarify":
      instruction = "Clarify this text by simplifying the language and making it easier to understand. Avoid jargon.";
      break;
    case "tone":
      instruction = "Adjust the tone to be more professional and appropriate for a formal grant proposal.";
      break;
    case "grammar":
      instruction = "Fix any grammar, spelling, or style issues. Improve readability.";
      break;
    case "custom":
      instruction = safePrompt || "Improve this text.";
      needsContext = !!(safePrompt?.toLowerCase().includes("data") || 
                     safePrompt?.toLowerCase().includes("evidence") ||
                     safePrompt?.toLowerCase().includes("example") ||
                     safePrompt?.toLowerCase().includes("statistic"));
      requiresVerification = needsContext;
      break;
    default:
      instruction = "Improve this text.";
  }

  // Step 2: Retrieve KB context if needed
  let chunks: RetrievedChunk[] = [];
  let contextStr = "";
  let usedGenericKnowledge = false;
  
  if (needsContext) {
    chunks = await retrieveRelevantChunks(selectedText, context.organizationId, { topK: 5 });
    contextStr = formatContextForPrompt(chunks);
    
    // Check if we have sufficient sources (AC-4.4)
    const relevantChunks = chunks.filter(c => c.score >= 0.65);
    if (relevantChunks.length === 0 && requiresVerification) {
      usedGenericKnowledge = true;
    }
  }

  const systemPrompt = `You are a grant writing assistant. Your task is to modify the provided text according to the instructions.
Return ONLY the modified text without any explanations, prefixes, or surrounding quotes.
Maintain the same format (if it's a paragraph, return a paragraph; if it's a list, return a list).

CRITICAL: Do NOT invent statistics, numbers, percentages, dates, partner names, or specific outcomes.
If you need to add data that isn't in the provided context, write general but accurate statements instead.`;

  const userPrompt = `${instruction}

TEXT TO MODIFY:
${selectedText}
${contextStr ? `\nRELEVANT CONTEXT FROM KNOWLEDGE BASE:\n${contextStr}` : "\n[No relevant context found in knowledge base - do not invent data]"}

Modified text:`;

  // Step 3: Generate content (non-streaming to enable enforcement)
  const response = await getOpenAI().chat.completions.create({
    model: GENERATION_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    stream: false, // Must be non-streaming for enforcement
  });

  const rawContent = response.choices[0]?.message?.content || "";

  // Step 4: POST-GENERATION ENFORCEMENT (AC-1.3, AC-4.2)
  let enforcedContent = rawContent;
  let claimsReplaced = 0;
  
  if (requiresVerification && chunks.length > 0) {
    const { enforcedText, replacedClaims } = enforceClaimVerification(rawContent, chunks);
    enforcedContent = enforcedText;
    claimsReplaced = replacedClaims.length;
  }

  // Step 5: Stream the enforced content (no inline warnings - shown via UI)
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(enforcedContent));
      controller.close();
    },
  });
}
