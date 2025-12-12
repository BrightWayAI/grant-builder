import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

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

export async function uploadFile(
  file: Buffer,
  filename: string,
  contentType: string,
  organizationId: string,
  folder: "documents" | "rfps" = "documents"
): Promise<{ url: string; key: string }> {
  const extension = filename.split(".").pop();
  const key = `${organizationId}/${folder}/${uuidv4()}.${extension}`;

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );

  const url = process.env.S3_ENDPOINT
    ? `${process.env.S3_ENDPOINT}/${BUCKET_NAME}/${key}`
    : `https://${BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;

  return { url, key };
}

export async function deleteFile(key: string): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  );
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(getS3Client(), command, { expiresIn });
}

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

export function getKeyFromUrl(url: string): string {
  const urlObj = new URL(url);
  return urlObj.pathname.replace(/^\//, "").replace(`${BUCKET_NAME}/`, "");
}
