import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt, isEncrypted, generateEncryptionKey } from "./encryption";

// Set up test encryption key
beforeAll(() => {
  process.env.ENCRYPTION_KEY = generateEncryptionKey();
});

describe("encryption", () => {
  describe("encrypt/decrypt", () => {
    it("should encrypt and decrypt a string correctly", () => {
      const plaintext = "test-secret-12345";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it("should produce different ciphertext for same plaintext (random IV)", () => {
      const plaintext = "test-secret";
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);
      
      expect(encrypted1).not.toBe(encrypted2);
    });

    it("should handle empty strings", () => {
      const plaintext = "";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it("should handle special characters", () => {
      const plaintext = "test!@#$%^&*()_+-=[]{}|;':\",./<>?";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it("should handle unicode characters", () => {
      const plaintext = "测试数据 🔐 тест";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });
  });

  describe("isEncrypted", () => {
    it("should return true for encrypted strings", () => {
      const encrypted = encrypt("test");
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it("should return false for plaintext TOTP secrets", () => {
      // TOTP secrets are base32 encoded, not hex with colons
      expect(isEncrypted("JBSWY3DPEHPK3PXP")).toBe(false);
    });

    it("should return false for random strings", () => {
      expect(isEncrypted("hello world")).toBe(false);
      expect(isEncrypted("abc:def")).toBe(false);
    });

    it("should return false for strings with wrong format", () => {
      expect(isEncrypted("aa:bb")).toBe(false); // only 2 parts
      expect(isEncrypted("aa:bb:cc:dd")).toBe(false); // 4 parts
    });
  });

  describe("generateEncryptionKey", () => {
    it("should generate a 64-character hex string", () => {
      const key = generateEncryptionKey();
      expect(key).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(key)).toBe(true);
    });

    it("should generate unique keys", () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      expect(key1).not.toBe(key2);
    });
  });
});
