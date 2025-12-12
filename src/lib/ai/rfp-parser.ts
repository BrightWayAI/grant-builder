import { z } from "zod";
import { getOpenAI, GENERATION_MODEL } from "./openai";

export const RFPSectionSchema = z.object({
  name: z.string(),
  description: z.string(),
  wordLimit: z.number().optional(),
  charLimit: z.number().optional(),
  pageLimit: z.number().optional(),
  isRequired: z.boolean(),
  pointValue: z.number().optional(),
});

export const ParsedRFPSchema = z.object({
  funderName: z.string(),
  programTitle: z.string(),
  deadline: z.string().optional(),
  fundingAmount: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .optional(),
  sections: z.array(RFPSectionSchema),
  eligibility: z.array(z.string()),
  attachments: z.array(z.string()),
  evaluationCriteria: z.array(z.string()).optional(),
  submissionInstructions: z.string().optional(),
  keyDates: z.array(z.object({
    date: z.string(),
    description: z.string(),
  })).optional(),
});

export type ParsedRFP = z.infer<typeof ParsedRFPSchema>;
export type RFPSection = z.infer<typeof RFPSectionSchema>;

const SYSTEM_PROMPT = `You are an expert grant writer assistant that extracts structured information from Request for Proposals (RFPs) and grant application guidelines.

Your task is to carefully analyze the provided RFP document and extract key information in a structured format.

Be thorough but accurate. If information is not clearly stated, use null or omit it rather than guessing.

For sections, identify all required narrative sections that the applicant needs to write. Include:
- Executive Summary
- Statement of Need / Problem Statement
- Project Description / Methodology
- Goals and Objectives
- Evaluation Plan
- Organizational Capacity / Background
- Budget Narrative
- Sustainability Plan
- Any other narrative sections specific to this RFP

For word/character/page limits, extract exact numbers if specified.
For attachments, list all required supplementary documents (letters of support, 990s, audit reports, resumes, etc.).
For eligibility, list all stated requirements (nonprofit status, geography, budget size, etc.).`;

export async function parseRFP(rfpText: string): Promise<ParsedRFP> {
  const response = await getOpenAI().chat.completions.create({
    model: GENERATION_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Please analyze this RFP and extract the structured information:

${rfpText}

Respond with a JSON object following this structure:
{
  "funderName": "Name of the funding organization",
  "programTitle": "Name of the grant program",
  "deadline": "Submission deadline (ISO date string if possible)",
  "fundingAmount": { "min": number, "max": number },
  "sections": [
    {
      "name": "Section name",
      "description": "Brief description of what should be included",
      "wordLimit": number or null,
      "charLimit": number or null,
      "pageLimit": number or null,
      "isRequired": boolean,
      "pointValue": number or null
    }
  ],
  "eligibility": ["Eligibility requirement 1", "Eligibility requirement 2"],
  "attachments": ["Required attachment 1", "Required attachment 2"],
  "evaluationCriteria": ["Criterion 1", "Criterion 2"],
  "submissionInstructions": "How and where to submit",
  "keyDates": [{ "date": "2024-01-15", "description": "Letter of Intent due" }]
}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  const parsed = JSON.parse(content);
  return ParsedRFPSchema.parse(parsed);
}

export function getDefaultSections(): RFPSection[] {
  return [
    {
      name: "Cover Letter",
      description: "Brief introduction and request summary",
      isRequired: false,
    },
    {
      name: "Executive Summary",
      description: "Overview of the proposal including organization, project, and funding request",
      isRequired: true,
    },
    {
      name: "Statement of Need",
      description: "Description of the problem or need the project addresses, supported by data",
      isRequired: true,
    },
    {
      name: "Project Description",
      description: "Detailed explanation of the proposed project, methodology, and activities",
      isRequired: true,
    },
    {
      name: "Goals and Objectives",
      description: "Specific, measurable goals and objectives for the project",
      isRequired: true,
    },
    {
      name: "Evaluation Plan",
      description: "How project success will be measured and evaluated",
      isRequired: true,
    },
    {
      name: "Organizational Capacity",
      description: "Organization background, qualifications, and ability to execute the project",
      isRequired: true,
    },
    {
      name: "Budget Narrative",
      description: "Explanation of how funds will be used and justification for expenses",
      isRequired: true,
    },
    {
      name: "Sustainability Plan",
      description: "How the project or its impact will continue after the grant period",
      isRequired: false,
    },
  ];
}
