import prisma from "./db";
import { AuditAction, Prisma } from "@prisma/client";
import { headers } from "next/headers";

interface AuditLogParams {
  userId?: string;
  userEmail?: string;
  organizationId?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  description?: string;
  metadata?: Prisma.InputJsonValue;
}

export async function audit(params: AuditLogParams): Promise<void> {
  try {
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || headersList.get("x-real-ip") 
      || "unknown";
    const userAgent = headersList.get("user-agent") || undefined;

    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        userEmail: params.userEmail,
        organizationId: params.organizationId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        description: params.description?.slice(0, 1000),
        ipAddress,
        userAgent: userAgent?.slice(0, 500),
        metadata: params.metadata || undefined,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

// Auth helpers
export async function auditLogin(userId: string, email: string, success: boolean): Promise<void> {
  await audit({
    userId: success ? userId : undefined,
    userEmail: email,
    action: success ? "LOGIN_SUCCESS" : "LOGIN_FAILED",
    description: success ? `User ${email} logged in` : `Failed login attempt for ${email}`,
  });
}

export async function auditLogout(userId: string, email: string): Promise<void> {
  await audit({
    userId,
    userEmail: email,
    action: "LOGOUT",
    description: `User ${email} logged out`,
  });
}

// User management
export async function auditUserCreated(
  userId: string,
  email: string,
  organizationId?: string,
  createdBy?: { id: string; email: string }
): Promise<void> {
  await audit({
    userId: createdBy?.id,
    userEmail: createdBy?.email,
    organizationId,
    action: "USER_CREATED",
    resourceType: "user",
    resourceId: userId,
    description: createdBy 
      ? `User ${email} created by ${createdBy.email}` 
      : `User ${email} registered`,
  });
}

export async function auditUserInvited(
  invitedEmail: string,
  organizationId: string,
  invitedBy: { id: string; email: string }
): Promise<void> {
  await audit({
    userId: invitedBy.id,
    userEmail: invitedBy.email,
    organizationId,
    action: "USER_INVITED",
    resourceType: "user",
    description: `${invitedBy.email} invited ${invitedEmail} to organization`,
  });
}

// Organization
export async function auditOrgCreated(
  orgId: string,
  orgName: string,
  userId: string,
  userEmail: string
): Promise<void> {
  await audit({
    userId,
    userEmail,
    organizationId: orgId,
    action: "ORG_CREATED",
    resourceType: "organization",
    resourceId: orgId,
    description: `Organization "${orgName}" created`,
  });
}

export async function auditOrgUpdated(
  orgId: string,
  userId: string,
  userEmail: string,
  changes?: Prisma.InputJsonValue
): Promise<void> {
  await audit({
    userId,
    userEmail,
    organizationId: orgId,
    action: "ORG_UPDATED",
    resourceType: "organization",
    resourceId: orgId,
    description: "Organization settings updated",
    metadata: changes,
  });
}

// Documents
export async function auditDocumentUploaded(
  documentId: string,
  filename: string,
  organizationId: string,
  userId: string,
  userEmail: string
): Promise<void> {
  await audit({
    userId,
    userEmail,
    organizationId,
    action: "DOCUMENT_UPLOADED",
    resourceType: "document",
    resourceId: documentId,
    description: `Document "${filename}" uploaded`,
  });
}

export async function auditDocumentDeleted(
  documentId: string,
  filename: string,
  organizationId: string,
  userId: string,
  userEmail: string
): Promise<void> {
  await audit({
    userId,
    userEmail,
    organizationId,
    action: "DOCUMENT_DELETED",
    resourceType: "document",
    resourceId: documentId,
    description: `Document "${filename}" deleted`,
  });
}

// Proposals
export async function auditProposalCreated(
  proposalId: string,
  title: string,
  organizationId: string,
  userId: string,
  userEmail: string
): Promise<void> {
  await audit({
    userId,
    userEmail,
    organizationId,
    action: "PROPOSAL_CREATED",
    resourceType: "proposal",
    resourceId: proposalId,
    description: `Proposal "${title}" created`,
  });
}

export async function auditProposalDeleted(
  proposalId: string,
  title: string,
  organizationId: string,
  userId: string,
  userEmail: string
): Promise<void> {
  await audit({
    userId,
    userEmail,
    organizationId,
    action: "PROPOSAL_DELETED",
    resourceType: "proposal",
    resourceId: proposalId,
    description: `Proposal "${title}" deleted`,
  });
}

export async function auditAiGeneration(
  proposalId: string,
  sectionName: string,
  organizationId: string,
  userId: string,
  userEmail: string
): Promise<void> {
  await audit({
    userId,
    userEmail,
    organizationId,
    action: "AI_CONTENT_GENERATED",
    resourceType: "proposal_section",
    resourceId: proposalId,
    description: `AI content generated for section "${sectionName}"`,
    metadata: { sectionName },
  });
}

export async function auditProposalExported(
  proposalId: string,
  title: string,
  format: string,
  organizationId: string,
  userId: string,
  userEmail: string
): Promise<void> {
  await audit({
    userId,
    userEmail,
    organizationId,
    action: "PROPOSAL_EXPORTED",
    resourceType: "proposal",
    resourceId: proposalId,
    description: `Proposal "${title}" exported as ${format}`,
    metadata: { format },
  });
}

// Admin
export async function auditAdminAccess(
  userId: string,
  userEmail: string,
  page: string
): Promise<void> {
  await audit({
    userId,
    userEmail,
    action: "ADMIN_ACCESS",
    description: `Admin accessed ${page}`,
    metadata: { page },
  });
}

// Data operations
export async function auditDataExported(
  userId: string,
  userEmail: string,
  organizationId: string,
  dataType: string
): Promise<void> {
  await audit({
    userId,
    userEmail,
    organizationId,
    action: "DATA_EXPORTED",
    description: `${dataType} data exported`,
    metadata: { dataType },
  });
}
