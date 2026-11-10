import { createHmac, createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { SessionController } from "./session.controller";
import { createGatewayAssertion } from "../infrastructure/gateway-assertion";

const key = Buffer.alloc(32, 3).toString("base64");
const gatewayKey = Buffer.alloc(32, 4).toString("base64");
const now = new Date("2026-11-10T09:00:00.000Z");
const deviceFingerprint =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const caddyFingerprint =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const tlsRequest = {
  raw: {
    socket: {
      getPeerCertificate: () => ({ fingerprint256: caddyFingerprint }),
    },
  },
};

function headersFor(target: string, body: string) {
  const issuedAt = "2026-11-10T08:59:30.000Z";
  const nonce = "nonce-01";
  const bodyHash = createHash("sha256").update(body).digest("hex");
  const signature = createHmac("sha256", Buffer.from(key, "base64"))
    .update(["POST", target, bodyHash, issuedAt, nonce].join("\n"))
    .digest("base64url");

  return {
    "x-skinlab-issued-at": issuedAt,
    "x-skinlab-nonce": nonce,
    "x-skinlab-signature": signature,
  };
}

describe("SessionController", () => {
  function dependencies(overrides = {}) {
    return {
      key,
      now: () => now,
      createLoginAttempt: { execute: vi.fn() },
      consumeLoginAttempt: { execute: vi.fn() },
      consumeNonce: vi.fn().mockResolvedValue(true),
      createSession: { execute: vi.fn() },
      verifyAccessToken: { verifyAccessToken: vi.fn() },
      consumeGatewayAssertion: vi.fn().mockResolvedValue(true),
      findRegisteredDevice: {
        find: vi.fn().mockResolvedValue({ isActive: true }),
      },
      gatewayAssertionKey: gatewayKey,
      configuredGatewayFingerprint: caddyFingerprint,
      getSession: { execute: vi.fn() },
      revokeSession: { execute: vi.fn() },
      getRefreshToken: { execute: vi.fn() },
      refreshSession: { execute: vi.fn() },
      ...overrides,
    };
  }

  it("accepts_one_authenticated_bff_login_attempt_request", async () => {
    const body = {
      state: "state-01",
      nonce: "oidc-nonce-01",
      codeVerifier: "pkce-verifier-01",
      expiresAt: "2026-11-10T09:05:00.000Z",
    };
    const serializedBody = JSON.stringify(body);
    const createLoginAttempt = {
      execute: vi.fn().mockResolvedValue({ attemptId: "attempt-01" }),
    };
    const consumeNonce = vi.fn().mockResolvedValue(true);
    const controller = new SessionController(
      dependencies({
        createLoginAttempt,
        consumeNonce,
      }),
    );

    await expect(
      controller.createLoginAttempt(
        body,
        headersFor("/internal/login-attempts", serializedBody),
      ),
    ).resolves.toEqual({ attemptId: "attempt-01" });
    expect(consumeNonce).toHaveBeenCalledWith(
      "nonce-01",
      new Date("2026-11-10T09:04:30.000Z"),
    );
    expect(createLoginAttempt.execute).toHaveBeenCalledWith({
      ...body,
      expiresAt: new Date("2026-11-10T09:05:00.000Z"),
    });
  });

  it("rejects_replayed_bff_nonce_before_creating_a_login_attempt", async () => {
    const body = {
      state: "state-01",
      nonce: "oidc-nonce-01",
      codeVerifier: "pkce-verifier-01",
      expiresAt: "2026-11-10T09:05:00.000Z",
    };
    const createLoginAttempt = { execute: vi.fn() };
    const controller = new SessionController(
      dependencies({
        createLoginAttempt,
        consumeNonce: vi.fn().mockResolvedValue(false),
      }),
    );

    await expect(
      controller.createLoginAttempt(
        body,
        headersFor("/internal/login-attempts", JSON.stringify(body)),
      ),
    ).rejects.toThrow("replayed");
    expect(createLoginAttempt.execute).not.toHaveBeenCalled();
  });

  it("consumes_a_login_attempt_only_through_a_signed_bff_request", async () => {
    const body = { returnedState: "state-01" };
    const consumeLoginAttempt = {
      execute: vi.fn().mockResolvedValue({
        nonceHash: "nonce-hash",
        codeVerifier: "pkce-verifier-01",
      }),
    };
    const controller = new SessionController(
      dependencies({
        consumeLoginAttempt,
      }),
    );

    await expect(
      controller.consumeLoginAttempt(
        "attempt-01",
        body,
        headersFor(
          "/internal/login-attempts/attempt-01/consume",
          JSON.stringify(body),
        ),
      ),
    ).resolves.toEqual({
      nonceHash: "nonce-hash",
      codeVerifier: "pkce-verifier-01",
    });
    expect(consumeLoginAttempt.execute).toHaveBeenCalledWith(
      "attempt-01",
      "state-01",
      now,
    );
  });

  it("creates_a_session_only_after_all_gateway_and_identity_checks_pass", async () => {
    const assertion = createGatewayAssertion(
      {
        id: "gateway-assertion-01",
        issuedAt: new Date("2026-11-10T08:59:30.000Z"),
        expiresAt: new Date("2026-11-10T09:00:00.001Z"),
        method: "GET",
        target: "/api/auth/callback",
        bodyHash:
          "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        deviceFingerprint,
        context: "clinic",
      },
      gatewayKey,
    );
    const body = {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      gatewayAssertion: assertion,
    };
    const createSession = {
      execute: vi.fn().mockResolvedValue({
        id: "opaque-session-id",
        expiresAt: new Date("2026-11-10T10:00:00.000Z"),
      }),
    };
    const controller = new SessionController(
      dependencies({
        createSession,
        verifyAccessToken: {
          verifyAccessToken: vi.fn().mockResolvedValue({
            subject: "subject-01",
            role: "receptionist",
            acr: "2",
            expiresAt: new Date("2026-11-10T10:00:00.000Z"),
          }),
        },
      }),
    );

    await expect(
      controller.createSession(
        body,
        headersFor("/internal/sessions", JSON.stringify(body)),
        tlsRequest,
      ),
    ).resolves.toEqual({
      sessionId: "opaque-session-id",
      expiresAt: "2026-11-10T10:00:00.000Z",
    });
    expect(createSession.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "subject-01",
        deviceFingerprint,
        accessContext: "clinic",
      }),
    );
  });

  it("denies_session_creation_when_the_gateway_tls_peer_is_not_caddy", async () => {
    const body = {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      gatewayAssertion: createGatewayAssertion(
        {
          id: "gateway-assertion-02",
          issuedAt: new Date("2026-11-10T08:59:30.000Z"),
          expiresAt: new Date("2026-11-10T09:00:00.001Z"),
          method: "GET",
          target: "/api/auth/callback",
          bodyHash:
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          deviceFingerprint,
          context: "clinic",
        },
        gatewayKey,
      ),
    };
    const controller = new SessionController(dependencies());

    await expect(
      controller.createSession(
        body,
        headersFor("/internal/sessions", JSON.stringify(body)),
        {
          raw: {
            socket: {
              getPeerCertificate: () => ({ fingerprint256: "forged" }),
            },
          },
        },
      ),
    ).rejects.toThrow("session access context");
  });

  it("reads_an_opaque_session_only_through_a_signed_bff_command", async () => {
    const getSession = {
      execute: vi.fn().mockResolvedValue({
        subject: "receptionist-01",
        role: "receptionist",
        accessContext: "clinic",
        expiresAt: new Date("2026-11-10T10:00:00.000Z"),
      }),
    };
    const body = { sessionId: "opaque-session-id" };
    const controller = new SessionController(dependencies({ getSession }));

    await expect(
      controller.getSession(
        body,
        headersFor("/internal/sessions/read", JSON.stringify(body)),
      ),
    ).resolves.toEqual({
      subject: "receptionist-01",
      role: "receptionist",
      accessContext: "clinic",
      expiresAt: "2026-11-10T10:00:00.000Z",
    });
    expect(getSession.execute).toHaveBeenCalledWith("opaque-session-id", now);
  });

  it("revokes_an_opaque_session_only_through_a_signed_bff_command", async () => {
    const revokeSession = { execute: vi.fn().mockResolvedValue(undefined) };
    const body = { sessionId: "opaque-session-id" };
    const controller = new SessionController(dependencies({ revokeSession }));

    await expect(
      controller.revokeSession(
        body,
        headersFor("/internal/sessions/revoke", JSON.stringify(body)),
      ),
    ).resolves.toEqual({ revoked: true });
    expect(revokeSession.execute).toHaveBeenCalledWith(
      "opaque-session-id",
      "browser-logout",
      now,
    );
  });

  it("rejects_refresh_without_a_fresh_gateway_assertion", async () => {
    const body = {
      sessionId: "opaque-session-id",
      previousRefreshToken: "refresh-01",
      nextRefreshToken: "refresh-02",
      accessToken: "access-token",
    };
    const controller = new SessionController(
      dependencies({
        getSession: { execute: vi.fn().mockResolvedValue(sessionForRefresh()) },
        verifyAccessToken: {
          verifyAccessToken: vi.fn().mockResolvedValue(identityForRefresh()),
        },
        refreshSession: {
          execute: vi.fn().mockResolvedValue({
            expiresAt: new Date("2026-11-10T10:00:00.000Z"),
          }),
        },
      }),
    );

    await expect(
      controller.refreshSession(
        body,
        headersFor("/internal/sessions/refresh", JSON.stringify(body)),
        tlsRequest,
      ),
    ).rejects.toThrow("refresh input");
  });
});

function sessionForRefresh() {
  return {
    id: "opaque-session-id",
    subject: "receptionist-01",
    role: "receptionist" as const,
    acr: "2",
    deviceFingerprint,
    accessContext: "clinic" as const,
    expiresAt: new Date("2026-11-10T10:00:00.000Z"),
  };
}

function identityForRefresh() {
  return {
    subject: "receptionist-01",
    role: "receptionist" as const,
    acr: "2",
    expiresAt: new Date("2026-11-10T10:00:00.000Z"),
  };
}
