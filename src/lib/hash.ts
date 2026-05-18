import crypto from "crypto";

const SALT = process.env.AUTHOR_HASH_SALT || "default-salt-change-me";

export function hashAuthorHandle(handle: string): string {
  return crypto
    .createHmac("sha256", SALT)
    .update(handle.toLowerCase().trim())
    .digest("hex");
}

const ENC_KEY = process.env.ENCRYPTION_KEY || "default-32-char-key-123456!";
const ENCRYPTION_ALGO = "aes-256-gcm";

function deriveKey(password: string): Buffer {
  return crypto.createHash("sha256").update(password).digest();
}

export function encrypt(text: string): string {
  const key = deriveKey(ENC_KEY);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGO, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
}

export function decrypt(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(":");
  if (!ivHex || !authTagHex || !encrypted) throw new Error("Invalid encrypted data");
  const key = deriveKey(ENC_KEY);
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGO, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
