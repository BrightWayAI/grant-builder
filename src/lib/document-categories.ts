import { DocumentType } from "@prisma/client";

export interface DocumentCategory {
  id: string;
  name: string;
  description: string;
  types: DocumentTypeInfo[];
  icon: string; // Lucide icon name
  priority: number; // For RAG retrieval weighting
  s3Folder: string; // Organized storage path
}

export interface DocumentTypeInfo {
  type: DocumentType;
  label: string;
  description: string;
  examples: string[];
  ragPriority: "high" | "medium" | "low";
  tips: string[];
}

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  {
    id: "proposals",
    name: "Past Proposals",
    description: "Successful grant applications that showcase your writing style and approach",
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
          "Include proposals from different funders for variety",
          "Recent proposals (last 2-3 years) are most relevant",
        ],
      },
    ],
  },
  {
    id: "organization",
    name: "Organization Info",
    description: "Documents that describe who you are and what you do",
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
          "Update when staff changes occur",
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
    description: "Details about what your organization delivers",
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
          "Update when program model changes",
        ],
      },
    ],
  },
  {
    id: "impact",
    name: "Impact & Outcomes",
    description: "Evidence of your organization's effectiveness",
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
          "Add recommendations and how you addressed them",
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
          "Add major accomplishments and milestones",
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
          "Useful for organizational data points",
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
          "Useful for demonstrating financial health",
        ],
      },
    ],
  },
  {
    id: "other",
    name: "Other Documents",
    description: "Additional supporting materials",
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
          "Consider if the content is relevant for proposals",
        ],
      },
    ],
  },
];

// Flat list of all document types with full info
export const ALL_DOCUMENT_TYPES = DOCUMENT_CATEGORIES.flatMap((cat) =>
  cat.types.map((t) => ({
    ...t,
    category: cat.id,
    categoryName: cat.name,
    s3Folder: cat.s3Folder,
  }))
);

// Get info for a specific document type
export function getDocumentTypeInfo(type: DocumentType) {
  return ALL_DOCUMENT_TYPES.find((t) => t.type === type);
}

// Get S3 folder for a document type
export function getS3FolderForType(type: DocumentType): string {
  const info = getDocumentTypeInfo(type);
  return info?.s3Folder || "other";
}

// Get RAG priority weight for scoring
export function getRagWeight(type: DocumentType): number {
  const info = getDocumentTypeInfo(type);
  switch (info?.ragPriority) {
    case "high":
      return 1.0;
    case "medium":
      return 0.7;
    case "low":
      return 0.4;
    default:
      return 0.5;
  }
}

// Check what document types are missing for an org
export function getMissingRecommendedTypes(existingTypes: DocumentType[]): DocumentTypeInfo[] {
  const highPriorityTypes = ALL_DOCUMENT_TYPES.filter((t) => t.ragPriority === "high");
  return highPriorityTypes.filter((t) => !existingTypes.includes(t.type));
}
