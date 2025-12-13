import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { DocumentType } from "@prisma/client";
import { getS3FolderForType } from "./document-categories";

function getS3Client() {
  return new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY!,
      secretAccessKey: process.env.AWS_SECRET_KEY!,
    },
    ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT }),
  });
}

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "";

/**
 * S3 folder structure:
 * /{organizationId}/
 *   /proposals/        - Past grant proposals
 *   /organization/     - Org overview, boilerplate, bios
 *   /programs/         - Program descriptions, logic models
 *   /impact/           - Impact reports, evaluations, annual reports
 *   /financials/       - 990s, audits
 *   /other/            - Miscellaneous
 *   /rfps/             - Uploaded RFP documents for parsing
 */

export interface UploadResult {
  url: string;
  key: string;
}

/**
 * Upload a document file with organized folder structure
 */
export async function uploadFile(
  file: Buffer,
  filename: string,
  contentType: string,
  organizationId: string,
  folder: string = "documents"
): Promise<UploadResult> {
  const extension = filename.split(".").pop() || "bin";
  const sanitizedFilename = sanitizeFilename(filename);
  const timestamp = Date.now();
  const uniqueId = uuidv4().slice(0, 8);
  
  // Key format: {orgId}/{folder}/{timestamp}-{uniqueId}-{sanitizedFilename}
  const key = `${organizationId}/${folder}/${timestamp}-${uniqueId}-${sanitizedFilename}`;

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      Metadata: {
        "original-filename": filename,
        "organization-id": organizationId,
        "upload-timestamp": timestamp.toString(),
      },
    })
  );

  const url = process.env.S3_ENDPOINT
    ? `${process.env.S3_ENDPOINT}/${BUCKET_NAME}/${key}`
    : `https://${BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;

  return { url, key };
}

/**
 * Upload a document with automatic folder based on document type
 */
export async function uploadDocument(
  file: Buffer,
  filename: string,
  contentType: string,
  organizationId: string,
  documentType: DocumentType
): Promise<UploadResult> {
  const folder = getS3FolderForType(documentType);
  return uploadFile(file, filename, contentType, organizationId, folder);
}

/**
 * Upload an RFP file
 */
export async function uploadRfp(
  file: Buffer,
  filename: string,
  contentType: string,
  organizationId: string
): Promise<UploadResult> {
  return uploadFile(file, filename, contentType, organizationId, "rfps");
}

/**
 * Delete a file from S3
 */
export async function deleteFile(key: string): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  );
}

/**
 * Get a signed URL for downloading a file
 */
export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(getS3Client(), command, { expiresIn });
}

/**
 * Get file contents as a Buffer
 */
export async function getFileBuffer(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  const response = await getS3Client().send(command);
  const byteArray = await response.Body?.transformToByteArray();
  if (!byteArray) {
    throw new Error("Failed to read file from storage");
  }
  return Buffer.from(byteArray);
}

/**
 * Extract the key from a full S3 URL
 */
export function getKeyFromUrl(url: string): string {
  const urlObj = new URL(url);
  return urlObj.pathname.replace(/^\//, "").replace(`${BUCKET_NAME}/`, "");
}

/**
 * Sanitize filename for S3 key
 */
function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100); // Limit length
}
