import { authenticator } from "otplib";
import * as QRCode from "qrcode";
import bcrypt from "bcryptjs";
import prisma from "./db";
import crypto from "crypto";
import { encrypt, decrypt, isEncrypted } from "./encryption";
import { MFA } from "./constants";

const { APP_NAME, BACKUP_CODE_COUNT } = MFA;

// Generate a new TOTP secret for a user
export function generateMfaSecret(): string {
  return authenticator.generateSecret();
}

// Generate QR code data URL for authenticator app setup
export async function generateQrCode(email: string, secret: string): Promise<string> {
  const otpauth = authenticator.keyuri(email, APP_NAME, secret);
  return QRCode.toDataURL(otpauth);
}

// Verify a TOTP token
export function verifyToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

// Generate backup codes
export function generateBackupCodes(count: number = BACKUP_CODE_COUNT): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(4).toString("hex").toUpperCase());
  }
  return codes;
}

// Hash backup codes for storage
export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((code) => bcrypt.hash(code, 10)));
}

// Verify and consume a backup code
export async function verifyBackupCode(
  userId: string,
  code: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaBackupCodes: true },
  });

  if (!user || !user.mfaBackupCodes.length) {
    return false;
  }

  for (let i = 0; i < user.mfaBackupCodes.length; i++) {
    const isMatch = await bcrypt.compare(code.toUpperCase(), user.mfaBackupCodes[i]);
    if (isMatch) {
      // Remove used backup code
      const updatedCodes = [...user.mfaBackupCodes];
      updatedCodes.splice(i, 1);
      await prisma.user.update({
        where: { id: userId },
        data: { mfaBackupCodes: updatedCodes },
      });
      return true;
    }
  }

  return false;
}

// Enable MFA for a user
export async function enableMfa(
  userId: string,
  secret: string,
  token: string
): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
  // Verify the token first
  if (!verifyToken(token, secret)) {
    return { success: false, error: "Invalid verification code" };
  }

  // Generate and hash backup codes
  const backupCodes = generateBackupCodes();
  const hashedCodes = await hashBackupCodes(backupCodes);

  // Encrypt the secret before storing
  const encryptedSecret = encrypt(secret);

  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaEnabled: true,
      mfaSecret: encryptedSecret,
      mfaBackupCodes: hashedCodes,
    },
  });

  return { success: true, backupCodes };
}

// Disable MFA for a user
export async function disableMfa(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: [],
    },
  });
}

// Verify MFA during login
export async function verifyMfa(
  userId: string,
  code: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaSecret: true, mfaEnabled: true },
  });

  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    return false;
  }

  // Decrypt the secret (handle both encrypted and legacy plaintext)
  let secret: string;
  try {
    secret = isEncrypted(user.mfaSecret) 
      ? decrypt(user.mfaSecret) 
      : user.mfaSecret;
  } catch {
    console.error("Failed to decrypt MFA secret");
    return false;
  }

  // Try TOTP first
  if (verifyToken(code, secret)) {
    return true;
  }

  // Try backup code
  return verifyBackupCode(userId, code);
}
