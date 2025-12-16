import prisma from "./db";
import { Prisma } from "@prisma/client";

export type ErrorType = "API_ERROR" | "AI_ERROR" | "CLIENT_ERROR" | "DOCUMENT_ERROR" | "AUTH_ERROR";

interface LogErrorParams {
  errorType: ErrorType;
  message: string;
  stack?: string;
  endpoint?: string;
  statusCode?: number;
  organizationId?: string;
  userId?: string;
  metadata?: Prisma.InputJsonValue;
}

export async function logError({
  errorType,
  message,
  stack,
  endpoint,
  statusCode,
  organizationId,
  userId,
  metadata,
}: LogErrorParams): Promise<void> {
  try {
    await prisma.errorLog.create({
      data: {
        errorType,
        message: message.slice(0, 5000), // Limit message length
        stack: stack?.slice(0, 10000),
        endpoint,
        statusCode,
        organizationId,
        userId,
        metadata: metadata || undefined,
      },
    });
  } catch (err) {
    // Don't throw - error logging should never break the app
    console.error("Failed to log error to database:", err);
  }
}

// Helper for API routes
export async function logApiError(
  error: unknown,
  endpoint: string,
  context?: { organizationId?: string; userId?: string; statusCode?: number }
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  
  await logError({
    errorType: "API_ERROR",
    message,
    stack,
    endpoint,
    statusCode: context?.statusCode || 500,
    organizationId: context?.organizationId,
    userId: context?.userId,
  });
}

// Helper for AI generation errors
export async function logAiError(
  error: unknown,
  context: { 
    organizationId?: string; 
    userId?: string; 
    proposalId?: string;
    sectionName?: string;
  }
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  
  await logError({
    errorType: "AI_ERROR",
    message,
    stack,
    endpoint: "/api/proposals/generate",
    organizationId: context.organizationId,
    userId: context.userId,
    metadata: {
      proposalId: context.proposalId || null,
      sectionName: context.sectionName || null,
    },
  });
}

// Helper for document processing errors
export async function logDocumentError(
  error: unknown,
  context: {
    organizationId?: string;
    userId?: string;
    documentId?: string;
    filename?: string;
  }
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  
  await logError({
    errorType: "DOCUMENT_ERROR",
    message,
    stack,
    endpoint: "/api/documents",
    organizationId: context.organizationId,
    userId: context.userId,
    metadata: {
      documentId: context.documentId || null,
      filename: context.filename || null,
    },
  });
}
