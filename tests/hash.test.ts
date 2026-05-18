import { hashAuthorHandle, encrypt, decrypt } from "../src/lib/hash";

describe("Hashing and Encryption", () => {
  describe("hashAuthorHandle", () => {
    it("should produce a consistent hash for the same input", () => {
      const hash1 = hashAuthorHandle("user@example.com");
      const hash2 = hashAuthorHandle("user@example.com");
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different inputs", () => {
      const hash1 = hashAuthorHandle("user_a");
      const hash2 = hashAuthorHandle("user_b");
      expect(hash1).not.toBe(hash2);
    });

    it("should be case insensitive", () => {
      const hash1 = hashAuthorHandle("UserOne");
      const hash2 = hashAuthorHandle("userone");
      expect(hash1).toBe(hash2);
    });

    it("should produce a hex string of 64 characters (SHA-256)", () => {
      const hash = hashAuthorHandle("test_handle_123");
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("encrypt and decrypt", () => {
    it("should encrypt and decrypt a display name", () => {
      const original = "Creator Name Here";
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it("should produce different ciphertexts for the same input (due to IV)", () => {
      const text = "Same Name";
      const enc1 = encrypt(text);
      const enc2 = encrypt(text);
      expect(enc1).not.toBe(enc2);
      expect(decrypt(enc1)).toBe(text);
      expect(decrypt(enc2)).toBe(text);
    });

    it("should handle Unicode characters", () => {
      const original = "தமிழ்ப் பெயர்";
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });
  });
});
