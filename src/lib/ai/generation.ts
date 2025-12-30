import { getOpenAI, GENERATION_MODEL } from "./openai";
import { retrieveRelevantChunks, formatContextForPrompt } from "./retrieval";
import prisma from "@/lib/db";

interface GenerationContext {
  organizationId: string;
  proposalId: string;
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

  const queryText = `${sectionName} ${description || ""} for grant proposal to ${context.funderName || "funder"}`;
  const relevantChunks = await retrieveRelevantChunks(queryText, context.organizationId, {
    topK: 8,
  });
  const formattedContext = formatContextForPrompt(relevantChunks);

  const systemPrompt = buildSystemPrompt(org, context);
  const userPrompt = buildUserPrompt({
    sectionName,
    description,
    wordLimit,
    charLimit,
    formattedContext,
    existingContent,
    customInstructions,
    funderName: context.funderName,
    programTitle: context.programTitle,
    fundingAmount: context.fundingAmount,
  });

  const response = await getOpenAI().chat.completions.create({
    model: GENERATION_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    stream: true,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          controller.enqueue(encoder.encode(content));
        }
      }
      controller.close();
    },
  });

  return stream;
}

function buildSystemPrompt(
  org: { name: string; mission?: string | null; geography?: string | null },
  context: GenerationContext
): string {
  return `You are an expert grant writer helping ${org.name} write compelling grant proposals.

Organization Details:
- Name: ${org.name}
- Mission: ${org.mission || "Not specified"}
- Geography: ${org.geography || "Not specified"}
${context.funderName ? `- Current Funder: ${context.funderName}` : ""}
${context.programTitle ? `- Grant Program: ${context.programTitle}` : ""}

Writing Guidelines:
1. Write in a professional, confident tone that reflects the organization's voice
2. Use specific data, statistics, and examples from the provided context
3. Be concise and impactful - every sentence should add value
4. Follow standard grant writing best practices
5. If you lack specific information, you MUST use this EXACT placeholder format:
   [[PLACEHOLDER:MISSING_DATA:description of needed info:auto]]
   Example: [[PLACEHOLDER:MISSING_DATA:annual budget amount:auto]]
   Example: [[PLACEHOLDER:USER_INPUT_REQUIRED:project start date:auto]]
6. Match the organization's existing writing style when context is provided
7. Focus on outcomes and impact, not just activities

FORMATTING RULES:
- Write in clean, readable prose - NO markdown formatting
- Do NOT use ** for bold, * for italic, or # for headers
- Use plain paragraphs separated by blank lines
- For lists, use simple dashes (-) or numbers (1. 2. 3.)
- Write as if for a formal printed document

DO NOT:
- Make up statistics or specific numbers not in the context
- Use generic filler language
- Exceed specified word/character limits
- Include information you're not confident about
- Use any markdown syntax (**, *, #, etc.)`;
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

export async function runCopilotAction(
  action: CopilotAction
): Promise<ReadableStream<Uint8Array>> {
  const { type, selectedText, customPrompt, context } = action;

  let instruction: string;
  let needsContext = false;

  switch (type) {
    case "expand":
      instruction = "Expand this text with more detail, examples, or supporting information. Approximately double the length.";
      needsContext = true;
      break;
    case "condense":
      instruction = "Condense this text to be more concise while preserving the key message. Reduce by approximately 30-50%.";
      break;
    case "strengthen":
      instruction = "Strengthen this text by adding data, evidence, or citations from the knowledge base. Make the argument more compelling.";
      needsContext = true;
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
      instruction = customPrompt || "Improve this text.";
      needsContext = !!(customPrompt?.toLowerCase().includes("data") || 
                     customPrompt?.toLowerCase().includes("evidence") ||
                     customPrompt?.toLowerCase().includes("example"));
      break;
    default:
      instruction = "Improve this text.";
  }

  let contextStr = "";
  if (needsContext) {
    const chunks = await retrieveRelevantChunks(selectedText, context.organizationId, { topK: 5 });
    contextStr = formatContextForPrompt(chunks);
  }

  const systemPrompt = `You are a grant writing assistant. Your task is to modify the provided text according to the instructions.
Return ONLY the modified text without any explanations, prefixes, or surrounding quotes.
Maintain the same format (if it's a paragraph, return a paragraph; if it's a list, return a list).`;

  const userPrompt = `${instruction}

TEXT TO MODIFY:
${selectedText}
${contextStr ? `\nRELEVANT CONTEXT FROM KNOWLEDGE BASE:\n${contextStr}` : ""}

Modified text:`;

  const response = await getOpenAI().chat.completions.create({
    model: GENERATION_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    stream: true,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          controller.enqueue(encoder.encode(content));
        }
      }
      controller.close();
    },
  });

  return stream;
}
