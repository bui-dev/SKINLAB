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

  it("handles_all_session_lifecycle_methods_with_correlation_id", async () => {
    let lastUrl = "";
    let lastBody = "";
    let lastHeaders: HeadersInit = {};
    const fetchImpl = async (input: URL | RequestInfo, init?: RequestInit) => {
      lastUrl = input.toString();
      lastBody = init?.body as string;
      lastHeaders = init?.headers ?? {};
      return new Response(
        JSON.stringify({
          success: true,
          sessionId: "sess-01",
          expiresAt: "2026-11-10T10:00:00.000Z",
          refreshToken: "ref-01",
          revoked: true,
          subject: "doc-01",
          role: "doctor",
          accessContext: "clinic",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    };
    const client = new InternalApiSessionClient({
      baseUrl: "https://api.skinlab.test",
      key,
      now: () => new Date("2026-11-10T09:00:00.000Z"),
      createNonce: () => "nonce-01",
      fetchImpl,
    });

    await client.createSession(
      { accessToken: "at", refreshToken: "rt", gatewayAssertion: {} },
      "corr-01",
    );
    expect(lastUrl).toBe("https://api.skinlab.test/internal/sessions");
    expect(lastHeaders).toMatchObject({
      "x-skinlab-correlation-id": "corr-01",
    });

    await client.getSession("sess-01");
    expect(lastUrl).toBe("https://api.skinlab.test/internal/sessions/read");
    expect(lastBody).toBe('{"sessionId":"sess-01"}');

    await client.getRefreshToken("sess-01");
    expect(lastUrl).toBe(
      "https://api.skinlab.test/internal/sessions/refresh-token/read",
    );

    await client.refreshSession({
      sessionId: "sess-01",
      previousRefreshToken: "p",
      nextRefreshToken: "n",
      accessToken: "a",
      gatewayAssertion: {},
    });
    expect(lastUrl).toBe("https://api.skinlab.test/internal/sessions/refresh");

    await client.revokeSession("sess-01");
    expect(lastUrl).toBe("https://api.skinlab.test/internal/sessions/revoke");
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
