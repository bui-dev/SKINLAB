// @vitest-environment node

import { createHash } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

const fakeIssuer = vi.hoisted(() => ({
  authorizationCodeGrant: vi.fn(),
  discovery: vi.fn(),
}));

vi.mock("openid-client", () => ({
  authorizationCodeGrant: fakeIssuer.authorizationCodeGrant,
  buildAuthorizationUrl: vi.fn(),
  calculatePKCECodeChallenge: vi.fn(),
  discovery: fakeIssuer.discovery,
  randomNonce: vi.fn(),
  randomPKCECodeVerifier: vi.fn(),
  randomState: vi.fn(),
  refreshTokenGrant: vi.fn(),
}));

import { OidcBffClient } from "./oidc-bff-client";

const env = {
  NODE_ENV: "test" as const,
  OIDC_ISSUER: "https://fake-issuer.test",
  OIDC_CLIENT_ID: "skinlab-web",
  OIDC_CLIENT_SECRET: "fake-client-secret",
  OIDC_REDIRECT_URI: "https://skinlab.test/api/auth/callback",
  OIDC_REQUIRED_ACR: 2,
  API_INTERNAL_BASE_URL: "https://caddy.test:9443",
  BFF_EXCHANGE_HMAC_KEY: Buffer.alloc(32, 3).toString("base64"),
  INTERNAL_TLS_CLIENT_CERT_PATH: "/run/secrets/bff-client-cert.pem",
  INTERNAL_TLS_CLIENT_KEY_PATH: "/run/secrets/bff-client-key.pem",
  INTERNAL_TLS_SERVER_CA_PATH: "/run/secrets/internal-server-ca.pem",
  SESSION_COOKIE_NAME: "skinlab_session",
  LOGIN_ATTEMPT_COOKIE_NAME: "skinlab_login_attempt",
};
const nonce = "nonce-from-fake-issuer";
const nonceHash = createHash("sha256").update(nonce).digest("hex");

describe("OidcBffClient callback with a fake issuer", () => {
  beforeEach(() => {
    fakeIssuer.discovery.mockResolvedValue({});
    fakeIssuer.authorizationCodeGrant.mockReset();
  });

  it("creates_server_side_callback_result_only_for_matching_nonce_and_acr_2", async () => {
    fakeIssuer.authorizationCodeGrant.mockResolvedValue({
      access_token: "fake-access-token",
      refresh_token: "fake-refresh-token",
      expires_in: 300,
      claims: () => ({ sub: "receptionist-01", nonce, acr: "2" }),
    });

    await expect(
      new OidcBffClient(env).exchangeCallback({
        callbackUrl: new URL(
          "https://skinlab.test/api/auth/callback?code=fake&state=state-01",
        ),
        returnedState: "state-01",
        nonceHash,
        codeVerifier: "pkce-verifier",
      }),
    ).resolves.toMatchObject({
      subject: "receptionist-01",
      accessToken: "fake-access-token",
      refreshToken: "fake-refresh-token",
    });
  });

  it.each([
    [
      "the nonce does not match",
      { sub: "receptionist-01", nonce: "wrong", acr: "2" },
    ],
    [
      "the assurance level is lower than required",
      { sub: "receptionist-01", nonce, acr: "1" },
    ],
  ])("rejects_the_callback_when_%s", async (_label, claims) => {
    fakeIssuer.authorizationCodeGrant.mockResolvedValue({
      access_token: "fake-access-token",
      refresh_token: "fake-refresh-token",
      expires_in: 300,
      claims: () => claims,
    });

    await expect(
      new OidcBffClient(env).exchangeCallback({
        callbackUrl: new URL(
          "https://skinlab.test/api/auth/callback?code=fake&state=state-01",
        ),
        returnedState: "state-01",
        nonceHash,
        codeVerifier: "pkce-verifier",
      }),
    ).rejects.toThrow("OIDC callback is invalid");
  });
});
