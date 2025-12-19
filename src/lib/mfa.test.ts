import { describe, it, expect, beforeAll } from "vitest";
import { authenticator } from "otplib";
import { generateEncryptionKey } from "./encryption";
import { 
  generateMfaSecret, 
  verifyToken, 
  generateBackupCodes,
  hashBackupCodes 
} from "./mfa";

// Set up test encryption key
beforeAll(() => {
  process.env.ENCRYPTION_KEY = generateEncryptionKey();
});

describe("mfa", () => {
  describe("generateMfaSecret", () => {
    it("should generate a valid base32 secret", () => {
      const secret = generateMfaSecret();
      
      // Base32 characters
      expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
      // Typical length for TOTP secrets
      expect(secret.length).toBeGreaterThanOrEqual(16);
    });

    it("should generate unique secrets", () => {
      const secret1 = generateMfaSecret();
      const secret2 = generateMfaSecret();
      
      expect(secret1).not.toBe(secret2);
    });
  });

  describe("verifyToken", () => {
    it("should verify a valid TOTP token", () => {
      const secret = generateMfaSecret();
      const token = authenticator.generate(secret);
      
      expect(verifyToken(token, secret)).toBe(true);
    });

    it("should reject an invalid token", () => {
      const secret = generateMfaSecret();
      
      expect(verifyToken("000000", secret)).toBe(false);
      expect(verifyToken("123456", secret)).toBe(false);
    });

    it("should reject malformed tokens", () => {
      const secret = generateMfaSecret();
      
      expect(verifyToken("", secret)).toBe(false);
      expect(verifyToken("12345", secret)).toBe(false); // too short
      expect(verifyToken("1234567", secret)).toBe(false); // too long
      expect(verifyToken("abcdef", secret)).toBe(false); // non-numeric
    });

    it("should handle invalid secrets gracefully", () => {
      expect(verifyToken("123456", "")).toBe(false);
      expect(verifyToken("123456", "invalid")).toBe(false);
    });
  });

  describe("generateBackupCodes", () => {
    it("should generate 10 backup codes by default", () => {
      const codes = generateBackupCodes();
      
      expect(codes).toHaveLength(10);
    });

    it("should generate specified number of codes", () => {
      const codes = generateBackupCodes(5);
      
      expect(codes).toHaveLength(5);
    });

    it("should generate 8-character uppercase hex codes", () => {
      const codes = generateBackupCodes();
      
      for (const code of codes) {
        expect(code).toHaveLength(8);
        expect(/^[0-9A-F]+$/.test(code)).toBe(true);
      }
    });

    it("should generate unique codes", () => {
      const codes = generateBackupCodes(100);
      const uniqueCodes = new Set(codes);
      
      expect(uniqueCodes.size).toBe(100);
    });
  });

  describe("hashBackupCodes", () => {
    it("should hash all backup codes", async () => {
      const codes = ["ABCD1234", "EFGH5678"];
      const hashed = await hashBackupCodes(codes);
      
      expect(hashed).toHaveLength(2);
      // bcrypt hashes start with $2
      expect(hashed[0].startsWith("$2")).toBe(true);
      expect(hashed[1].startsWith("$2")).toBe(true);
    });

    it("should produce different hashes for same code (due to salt)", async () => {
      const codes = ["SAME1234", "SAME1234"];
      const hashed = await hashBackupCodes(codes);
      
      expect(hashed[0]).not.toBe(hashed[1]);
    });
  });
});
