import { createHash, createHmac, randomUUID } from "node:crypto";

export type GatewayAssertionInput = {
  deviceFingerprint: string;
  context: "clinic" | "remote";
  method?: string;
  target?: string;
  issuedAt?: Date;
  expiresAt?: Date;
};

export function createGatewayAssertion(
  input: GatewayAssertionInput,
  hmacKeyBase64: string,
): Record<string, unknown> {
  const now = input.issuedAt ?? new Date();
  const expiresAt = input.expiresAt ?? new Date(now.getTime() + 60_000);
  const id = randomUUID();
  const method = input.method ?? "GET";
  const target = input.target ?? "/api/auth/callback";
  const emptyBodyHash = createHash("sha256").update("").digest("hex");

  const canonical = [
    id,
    now.toISOString(),
    expiresAt.toISOString(),
    method,
    target,
    emptyBodyHash,
    input.deviceFingerprint,
    input.context,
  ].join("\n");

  const signature = createHmac("sha256", Buffer.from(hmacKeyBase64, "base64"))
    .update(canonical)
    .digest("base64url");

  return {
    id,
    issuedAt: now,
    expiresAt: expiresAt,
    method,
    target,
    bodyHash: emptyBodyHash,
    deviceFingerprint: input.deviceFingerprint,
    context: input.context,
    signature,
  };
}

export function createTamperedGatewayAssertion(
  input: GatewayAssertionInput,
  hmacKeyBase64: string,
): Record<string, unknown> {
  const valid = createGatewayAssertion(input, hmacKeyBase64);
  return {
    ...valid,
    signature: "forged-tampered-signature-that-fails-hmac",
  };
}
