import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function extractTextFromFile(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  const normalizedType = fileType.toLowerCase();

  if (normalizedType === "pdf" || normalizedType === "application/pdf") {
    return extractTextFromPDF(buffer);
  }

  if (
    normalizedType === "docx" ||
    normalizedType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractTextFromDOCX(buffer);
  }

  if (normalizedType === "txt" || normalizedType === "text/plain") {
    return buffer.toString("utf-8");
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

export function getFileTypeFromMime(mimeType: string): string {
  const mimeToType: Record<string, string> = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
  };
  return mimeToType[mimeType] || mimeType;
}

export function isValidFileType(mimeType: string): boolean {
  const validTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];
  return validTypes.includes(mimeType);
}
