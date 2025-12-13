import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { DocumentType } from "@prisma/client";

export interface ProcessedDocument {
  text: string;
  metadata: DocumentMetadata;
  sections: DocumentSection[];
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  date?: string;
  wordCount: number;
  pageCount?: number;
  keyTerms: string[];
  documentType: DocumentType;
  summary?: string;
}

export interface DocumentSection {
  title: string;
  content: string;
  level: number; // 1 = h1, 2 = h2, etc.
  startIndex: number;
}

// Common grant/nonprofit terms to extract
const KEY_TERMS = [
  "mission", "vision", "goals", "objectives", "outcomes", "impact",
  "beneficiaries", "target population", "community", "stakeholders",
  "budget", "funding", "revenue", "expenses", "sustainability",
  "evaluation", "metrics", "indicators", "assessment",
  "program", "project", "initiative", "intervention",
  "partnership", "collaboration", "coalition",
  "capacity building", "training", "technical assistance",
  "evidence-based", "best practices", "theory of change",
];

/**
 * Extract text from PDF with metadata
 */
export async function extractFromPDF(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const data = await pdfParse(buffer);
  return {
    text: data.text,
    pageCount: data.numpages,
  };
}

/**
 * Extract text from DOCX with structure preservation
 */
export async function extractFromDOCX(buffer: Buffer): Promise<{ text: string; html: string }> {
  const [textResult, htmlResult] = await Promise.all([
    mammoth.extractRawText({ buffer }),
    mammoth.convertToHtml({ buffer }),
  ]);
  return {
    text: textResult.value,
    html: htmlResult.value,
  };
}

/**
 * Clean and normalize text
 */
export function cleanText(text: string): string {
  return text
    // Normalize whitespace
    .replace(/\s+/g, " ")
    // Remove excessive newlines
    .replace(/\n{3,}/g, "\n\n")
    // Remove page numbers and headers/footers (common patterns)
    .replace(/Page \d+ of \d+/gi, "")
    .replace(/^\d+$/gm, "")
    // Remove URLs (keep for metadata but not for embedding)
    .replace(/https?:\/\/[^\s]+/g, "[URL]")
    // Normalize quotes
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Remove excessive punctuation
    .replace(/\.{4,}/g, "...")
    .trim();
}

/**
 * Extract document sections based on headings
 */
export function extractSections(text: string, html?: string): DocumentSection[] {
  const sections: DocumentSection[] = [];
  
  // If we have HTML (from DOCX), use heading tags
  if (html) {
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
    let match;
    let lastIndex = 0;
    let lastSection: DocumentSection | null = null;
    
    // Strip HTML tags for content extraction
    const stripHtml = (s: string) => s.replace(/<[^>]*>/g, "").trim();
    
    while ((match = headingRegex.exec(html)) !== null) {
      const level = parseInt(match[1]);
      const title = stripHtml(match[2]);
      
      if (lastSection) {
        // Get content between last heading and this one
        const contentHtml = html.slice(lastIndex, match.index);
        lastSection.content = cleanText(stripHtml(contentHtml));
      }
      
      lastSection = {
        title,
        content: "",
        level,
        startIndex: match.index,
      };
      sections.push(lastSection);
      lastIndex = match.index + match[0].length;
    }
    
    // Get content after last heading
    if (lastSection && lastIndex < html.length) {
      const contentHtml = html.slice(lastIndex);
      lastSection.content = cleanText(stripHtml(contentHtml));
    }
  }
  
  // Fallback: detect sections from plain text patterns
  if (sections.length === 0) {
    const lines = text.split("\n");
    let currentSection: DocumentSection | null = null;
    let currentContent: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect likely headings
      const isHeading = (
        // All caps short line
        (line.length < 100 && line === line.toUpperCase() && /[A-Z]/.test(line)) ||
        // Numbered section
        /^(\d+\.)+\s+[A-Z]/.test(line) ||
        // Roman numerals
        /^[IVX]+\.\s+/i.test(line) ||
        // Common section headers
        /^(executive summary|introduction|background|methodology|results|conclusion|budget|timeline|evaluation)/i.test(line)
      );
      
      if (isHeading && line.length > 0) {
        // Save previous section
        if (currentSection) {
          currentSection.content = cleanText(currentContent.join("\n"));
        }
        
        currentSection = {
          title: line,
          content: "",
          level: line === line.toUpperCase() ? 1 : 2,
          startIndex: i,
        };
        sections.push(currentSection);
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }
    
    // Save last section
    if (currentSection) {
      currentSection.content = cleanText(currentContent.join("\n"));
    }
  }
  
  return sections;
}

/**
 * Extract key terms from text
 */
export function extractKeyTerms(text: string): string[] {
  const lowerText = text.toLowerCase();
  const found: string[] = [];
  
  for (const term of KEY_TERMS) {
    if (lowerText.includes(term.toLowerCase())) {
      found.push(term);
    }
  }
  
  return found;
}

/**
 * Try to extract title from document
 */
export function extractTitle(text: string, filename: string): string {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  
  // First non-empty line is often the title
  if (lines.length > 0 && lines[0].length < 200) {
    return lines[0].trim();
  }
  
  // Fall back to filename
  return filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
}

/**
 * Process a document and extract all metadata and structure
 */
export async function processDocument(
  buffer: Buffer,
  mimeType: string,
  filename: string,
  documentType: DocumentType
): Promise<ProcessedDocument> {
  let text = "";
  let html: string | undefined;
  let pageCount: number | undefined;
  
  const normalizedType = mimeType.toLowerCase();
  
  if (normalizedType === "application/pdf") {
    const result = await extractFromPDF(buffer);
    text = result.text;
    pageCount = result.pageCount;
  } else if (normalizedType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await extractFromDOCX(buffer);
    text = result.text;
    html = result.html;
  } else if (normalizedType === "text/plain") {
    text = buffer.toString("utf-8");
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
  
  const cleanedText = cleanText(text);
  const sections = extractSections(text, html);
  const keyTerms = extractKeyTerms(cleanedText);
  const title = extractTitle(text, filename);
  
  return {
    text: cleanedText,
    metadata: {
      title,
      wordCount: cleanedText.split(/\s+/).length,
      pageCount,
      keyTerms,
      documentType,
    },
    sections,
  };
}

/**
 * Get file type from MIME type
 */
export function getFileTypeFromMime(mimeType: string): string {
  const mimeToType: Record<string, string> = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
  };
  return mimeToType[mimeType] || mimeType;
}

/**
 * Check if file type is supported
 */
export function isValidFileType(mimeType: string): boolean {
  const validTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];
  return validTypes.includes(mimeType);
}
