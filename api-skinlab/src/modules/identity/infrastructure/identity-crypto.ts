import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

export function hashOpaqueValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createOpaqueId(): string {
  return randomBytes(32).toString("base64url");
}

export function encryptSecret(value: string, encodedKey: string): string {
  const key = Buffer.from(encodedKey, "base64");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

export function decryptSecret(value: string, encodedKey: string): string {
  const key = Buffer.from(encodedKey, "base64");
  const payload = Buffer.from(value, "base64url");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8",
  );
}
