import { DocumentType } from "@prisma/client";

export interface DocumentCategory {
  id: string;
  name: string;
  description: string;
  types: DocumentTypeInfo[];
  icon: string;
  priority: number;
  s3Folder: string;
}

export interface DocumentTypeInfo {
  type: DocumentType;
  label: string;
  description: string;
  examples: string[];
  ragPriority: "high" | "medium" | "low";
  tips: string[];
}

// Funder types for proposals and RFPs
export const FUNDER_TYPES = [
  { value: "federal", label: "Federal Government", description: "NIH, NSF, DOE, etc." },
  { value: "state", label: "State Government", description: "State agencies and programs" },
  { value: "local", label: "Local Government", description: "City, county, municipal" },
  { value: "foundation", label: "Private Foundation", description: "Gates, Ford, MacArthur, etc." },
  { value: "corporate", label: "Corporate", description: "Corporate giving programs" },
  { value: "community", label: "Community Foundation", description: "Regional community foundations" },
  { value: "other", label: "Other", description: "Other funder types" },
];

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  {
    id: "proposals",
    name: "Past Proposals & RFPs",
    description: "Upload successful grant applications along with their RFPs to help the AI learn your writing style and how you respond to requirements",
    icon: "FileText",
    priority: 1,
    s3Folder: "proposals",
    types: [
      {
        type: "PROPOSAL",
        label: "Grant Proposal",
        description: "Complete grant applications (funded or submitted)",
        examples: ["Federal grant narratives", "Foundation proposals", "Corporate giving applications"],
        ragPriority: "high",
        tips: [
          "Upload your most successful proposals first",
          "Include the matching RFP if you have it",
          "Tag with funder type for better matching",
          "Recent proposals (last 2-3 years) are most relevant",
        ],
      },
    ],
  },
  {
    id: "organization",
    name: "Organization Info",
    description: "Documents that describe who you are, your mission, and your team",
    icon: "Building2",
    priority: 2,
    s3Folder: "organization",
    types: [
      {
        type: "ORG_OVERVIEW",
        label: "Organization Overview",
        description: "Mission, vision, history, and general information",
        examples: ["About Us document", "Organizational profile", "Mission statement"],
        ragPriority: "high",
        tips: [
          "Include your mission and vision statements",
          "Add founding story and key milestones",
          "Keep this document updated regularly",
        ],
      },
      {
        type: "BOILERPLATE",
        label: "Boilerplate Text",
        description: "Reusable text blocks commonly used in proposals",
        examples: ["Standard org description", "Diversity statement", "Capacity statement"],
        ragPriority: "high",
        tips: [
          "Include your standard organizational description",
          "Add any required statements (DEI, sustainability, etc.)",
          "Update after major organizational changes",
        ],
      },
      {
        type: "STAFF_BIOS",
        label: "Staff Bios",
        description: "Biographies of key staff members",
        examples: ["Executive team bios", "Program manager profiles", "Key personnel CVs"],
        ragPriority: "medium",
        tips: [
          "Include credentials and relevant experience",
          "Focus on staff who lead grant-funded programs",
        ],
      },
      {
        type: "BOARD_BIOS",
        label: "Board Bios",
        description: "Board member information and expertise",
        examples: ["Board roster with bios", "Board member profiles"],
        ragPriority: "low",
        tips: [
          "Include professional backgrounds",
          "Note any relevant expertise for specific programs",
        ],
      },
    ],
  },
  {
    id: "programs",
    name: "Programs & Services",
    description: "Details about what your organization delivers and how",
    icon: "Target",
    priority: 3,
    s3Folder: "programs",
    types: [
      {
        type: "PROGRAM_DESCRIPTION",
        label: "Program Description",
        description: "Detailed descriptions of programs and services",
        examples: ["Program brochures", "Service descriptions", "Program guides"],
        ragPriority: "high",
        tips: [
          "Include goals, activities, and target populations",
          "Add information about program delivery methods",
          "Include any evidence-based frameworks used",
        ],
      },
      {
        type: "LOGIC_MODEL",
        label: "Logic Model",
        description: "Visual representation of program theory and outcomes",
        examples: ["Logic model diagrams", "Theory of change", "Program framework"],
        ragPriority: "high",
        tips: [
          "Include inputs, activities, outputs, and outcomes",
          "Make sure text is extractable (not just images)",
        ],
      },
    ],
  },
  {
    id: "impact",
    name: "Impact & Outcomes",
    description: "Evidence of your organization's effectiveness and results",
    icon: "TrendingUp",
    priority: 4,
    s3Folder: "impact",
    types: [
      {
        type: "IMPACT_REPORT",
        label: "Impact Report",
        description: "Reports showing program outcomes and success stories",
        examples: ["Annual impact report", "Program outcomes summary", "Success stories"],
        ragPriority: "high",
        tips: [
          "Include specific metrics and data",
          "Add client/beneficiary testimonials",
          "Recent reports carry more weight",
        ],
      },
      {
        type: "EVALUATION_REPORT",
        label: "Evaluation Report",
        description: "Third-party or internal program evaluations",
        examples: ["External evaluation", "Program assessment", "Needs assessment"],
        ragPriority: "medium",
        tips: [
          "Include methodology and findings",
          "Note any evidence of effectiveness",
        ],
      },
      {
        type: "ANNUAL_REPORT",
        label: "Annual Report",
        description: "Yearly summary of activities and achievements",
        examples: ["Annual report to stakeholders", "Year in review"],
        ragPriority: "medium",
        tips: [
          "Most recent reports are most useful",
          "Include financial highlights if available",
        ],
      },
    ],
  },
  {
    id: "financials",
    name: "Financial Documents",
    description: "Documents demonstrating financial health and accountability",
    icon: "DollarSign",
    priority: 5,
    s3Folder: "financials",
    types: [
      {
        type: "FORM_990",
        label: "Form 990",
        description: "IRS Form 990 tax filing",
        examples: ["Most recent 990", "990-EZ"],
        ragPriority: "low",
        tips: [
          "Upload most recent filing",
          "Some funders require multiple years",
        ],
      },
      {
        type: "AUDITED_FINANCIALS",
        label: "Audited Financials",
        description: "Audited financial statements",
        examples: ["Audit report", "Financial statements"],
        ragPriority: "low",
        tips: [
          "Upload most recent audit",
          "Include any management letter if available",
        ],
      },
    ],
  },
  {
    id: "other",
    name: "Other Documents",
    description: "Additional supporting materials that don't fit other categories",
    icon: "Folder",
    priority: 6,
    s3Folder: "other",
    types: [
      {
        type: "OTHER",
        label: "Other",
        description: "Any other relevant documents",
        examples: ["MOU/MOAs", "Letters of support", "Partnership agreements"],
        ragPriority: "low",
        tips: [
          "Use for documents that don't fit other categories",
        ],
      },
    ],
  },
];

export const ALL_DOCUMENT_TYPES = DOCUMENT_CATEGORIES.flatMap((cat) =>
  cat.types.map((t) => ({
    ...t,
    category: cat.id,
    categoryName: cat.name,
    s3Folder: cat.s3Folder,
  }))
);

export function getDocumentTypeInfo(type: DocumentType) {
  return ALL_DOCUMENT_TYPES.find((t) => t.type === type);
}

export function getS3FolderForType(type: DocumentType): string {
  const info = getDocumentTypeInfo(type);
  return info?.s3Folder || "other";
}

export function getRagWeight(type: DocumentType): number {
  const info = getDocumentTypeInfo(type);
  switch (info?.ragPriority) {
    case "high": return 1.0;
    case "medium": return 0.7;
    case "low": return 0.4;
    default: return 0.5;
  }
}

export function getMissingRecommendedTypes(existingTypes: DocumentType[]): DocumentTypeInfo[] {
  const highPriorityTypes = ALL_DOCUMENT_TYPES.filter((t) => t.ragPriority === "high");
  return highPriorityTypes.filter((t) => !existingTypes.includes(t.type));
}
