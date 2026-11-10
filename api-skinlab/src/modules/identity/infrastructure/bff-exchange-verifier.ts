import { createHmac, createHash, timingSafeEqual } from "node:crypto";

export class BffExchangeVerificationError extends Error {}

export type VerifyBffExchangeInput = {
  key: string;
  request: { method: string; target: string; body: string };
  headers: { issuedAt: string; nonce: string; signature: string };
  now: Date;
  isNonceUsed: (nonce: string) => boolean;
};

const maximumAgeMs = 5 * 60 * 1000;

export function verifyBffExchange(
  input: VerifyBffExchangeInput,
): { nonce: string } {
  const issuedAt = new Date(input.headers.issuedAt);
  if (
    Number.isNaN(issuedAt.getTime()) ||
    issuedAt > input.now ||
    input.now.getTime() - issuedAt.getTime() > maximumAgeMs ||
    input.isNonceUsed(input.headers.nonce)
  ) {
    throw new BffExchangeVerificationError("The BFF exchange is stale or replayed.");
  }

  const bodyHash = createHash("sha256").update(input.request.body).digest("hex");
  const canonical = [
    input.request.method,
    input.request.target,
    bodyHash,
    input.headers.issuedAt,
    input.headers.nonce,
  ].join("\n");
  const expected = createHmac("sha256", Buffer.from(input.key, "base64"))
    .update(canonical)
    .digest();
  const received = Buffer.from(input.headers.signature, "base64url");

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new BffExchangeVerificationError("The BFF exchange signature is invalid.");
  }

  return { nonce: input.headers.nonce };
}
