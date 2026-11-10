import { createHmac, createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  createBffExchangeHeaders,
  decodeGatewayAssertionHeader,
  InternalApiSessionClient,
} from "./api-session-client";

const key = Buffer.alloc(32, 3).toString("base64");

describe("createBffExchangeHeaders", () => {
  it("signs_the_exact_method_target_and_body_with_a_fresh_nonce", () => {
    const body = '{"state":"state-01"}';
    const headers = createBffExchangeHeaders({
      key,
      method: "POST",
      target: "/internal/login-attempts",
      body,
      issuedAt: new Date("2026-11-10T09:00:00.000Z"),
      nonce: "nonce-01",
    });
    const bodyHash = createHash("sha256").update(body).digest("hex");
    const expected = createHmac("sha256", Buffer.from(key, "base64"))
      .update(
        [
          "POST",
          "/internal/login-attempts",
          bodyHash,
          "2026-11-10T09:00:00.000Z",
          "nonce-01",
        ].join("\n"),
      )
      .digest("base64url");

    expect(headers).toEqual({
      "x-skinlab-issued-at": "2026-11-10T09:00:00.000Z",
      "x-skinlab-nonce": "nonce-01",
      "x-skinlab-signature": expected,
    });
  });
});

describe("InternalApiSessionClient", () => {
  it("posts_json_over_the_signed_internal_channel", async () => {
    const fetchImpl = async (input: URL | RequestInfo, init?: RequestInit) => {
      expect(input.toString()).toBe(
        "https://api.skinlab.test/internal/login-attempts",
      );
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe('{"state":"state-01"}');
      expect(init?.headers).toMatchObject({
        "content-type": "application/json",
        "x-skinlab-nonce": "nonce-01",
      });
      return new Response(JSON.stringify({ attemptId: "attempt-01" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    };
    const client = new InternalApiSessionClient({
      baseUrl: "https://api.skinlab.test",
      key,
      now: () => new Date("2026-11-10T09:00:00.000Z"),
      createNonce: () => "nonce-01",
      fetchImpl,
    });

    await expect(
      client.post("/internal/login-attempts", { state: "state-01" }),
    ).resolves.toEqual({ attemptId: "attempt-01" });
  });
});

describe("decodeGatewayAssertionHeader", () => {
  it("decodes_only_a_JSON_gateway_assertion_header", () => {
    const value = Buffer.from('{"id":"assertion-01"}').toString("base64url");
    expect(decodeGatewayAssertionHeader(value)).toEqual({ id: "assertion-01" });
    expect(() => decodeGatewayAssertionHeader("not-json")).toThrow(
      "gateway assertion",
    );
  });
});
