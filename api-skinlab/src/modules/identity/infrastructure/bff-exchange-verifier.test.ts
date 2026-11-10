import { createHmac, createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  BffExchangeVerificationError,
  verifyBffExchange,
} from "./bff-exchange-verifier";

const key = Buffer.alloc(32, 3).toString("base64");
const now = new Date("2026-11-10T09:00:00.000Z");

function signedHeaders(
  method = "POST",
  target = "/internal/login-attempts",
  body = '{"state":"state-01"}',
) {
  const issuedAt = "2026-11-10T08:59:30.000Z";
  const nonce = "nonce-01";
  const bodyHash = createHash("sha256").update(body).digest("hex");
  const canonical = [method, target, bodyHash, issuedAt, nonce].join("\n");
  const signature = createHmac("sha256", Buffer.from(key, "base64"))
    .update(canonical)
    .digest("base64url");

  return { issuedAt, nonce, signature };
}

describe("verifyBffExchange", () => {
  it("accepts_a_fresh_request_bound_signature_once", () => {
    const body = '{"state":"state-01"}';
    expect(
      verifyBffExchange({
        key,
        request: { method: "POST", target: "/internal/login-attempts", body },
        headers: signedHeaders(undefined, undefined, body),
        now,
        isNonceUsed: () => false,
      }),
    ).toEqual({ nonce: "nonce-01" });
  });

  it.each([
    ["changed body", { method: "POST", target: "/internal/login-attempts", body: '{"state":"changed"}' }, signedHeaders()],
    ["stale timestamp", { method: "POST", target: "/internal/login-attempts", body: '{"state":"state-01"}' }, { ...signedHeaders(), issuedAt: "2026-11-10T08:53:59.999Z" }],
  ])("rejects_%s", (_label, request, headers) => {
    expect(() =>
      verifyBffExchange({
        key,
        request,
        headers,
        now,
        isNonceUsed: () => false,
      }),
    ).toThrow(BffExchangeVerificationError);
  });

  it("rejects_a_replayed_nonce_even_with_a_valid_signature", () => {
    expect(() =>
      verifyBffExchange({
        key,
        request: {
          method: "POST",
          target: "/internal/login-attempts",
          body: '{"state":"state-01"}',
        },
        headers: signedHeaders(),
        now,
        isNonceUsed: () => true,
      }),
    ).toThrow(BffExchangeVerificationError);
  });
});
