import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getEncryptionKey() {
  const encoded = process.env.SHIFTSTREAM_TOKEN_ENCRYPTION_KEY;
  if (!encoded) {
    throw new Error("ShiftStream token encryption key is not configured.");
  }

  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("ShiftStream token encryption key must decode to 32 bytes.");
  }
  return key;
}

export function encryptToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);

  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptToken(value: string) {
  const [ivPart, tagPart, ciphertextPart] = value.split(".");
  if (!ivPart || !tagPart || !ciphertextPart) {
    throw new Error("Stored provider token has an invalid encrypted format.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivPart, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
