import { describe, expect, it } from "vitest";

import {
  clientEnvSchema,
  loadWebServerEnv,
  serverEnvSchema,
} from "@/config/env";

describe("environment schemas", () => {
  it("accepts valid server and public API URLs", () => {
    expect(
      serverEnvSchema.safeParse({ API_BASE_URL: "https://api.example.com" })
        .success,
    ).toBe(true);
    expect(
      clientEnvSchema.safeParse({
        NEXT_PUBLIC_API_BASE_URL: "https://api.example.com",
      }).success,
    ).toBe(true);
  });

  it("rejects_missing_web_oidc_callback_configuration", () => {
    expect(() =>
      loadWebServerEnv({
        NODE_ENV: "test",
        OIDC_ISSUER: "https://identity.example.com",
        OIDC_CLIENT_ID: "skinlab-web",
        OIDC_CLIENT_SECRET: "fake-client-secret",
        OIDC_REQUIRED_ACR: "2",
        API_INTERNAL_BASE_URL: "https://api.internal:3001",
        BFF_EXCHANGE_HMAC_KEY: "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=",
        SESSION_COOKIE_NAME: "skinlab_session",
        LOGIN_ATTEMPT_COOKIE_NAME: "skinlab_login_attempt",
      }),
    ).toThrow();
  });

  it("does_not_expose_server_secrets", () => {
    const env = loadWebServerEnv({
      NODE_ENV: "test",
      OIDC_ISSUER: "https://identity.example.com",
      OIDC_CLIENT_ID: "skinlab-web",
      OIDC_CLIENT_SECRET: "fake-client-secret",
      OIDC_REDIRECT_URI: "http://localhost:3000/api/auth/callback",
      OIDC_REQUIRED_ACR: "2",
      API_INTERNAL_BASE_URL: "https://api.internal:3001",
      BFF_EXCHANGE_HMAC_KEY: "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=",
      INTERNAL_TLS_CLIENT_CERT_PATH: "/run/secrets/bff-client-cert.pem",
      INTERNAL_TLS_CLIENT_KEY_PATH: "/run/secrets/bff-client-key.pem",
      INTERNAL_TLS_SERVER_CA_PATH: "/run/secrets/internal-server-ca.pem",
      SESSION_COOKIE_NAME: "skinlab_session",
      LOGIN_ATTEMPT_COOKIE_NAME: "skinlab_login_attempt",
      NEXT_PUBLIC_OIDC_CLIENT_SECRET: "must-not-be-read",
    });

    expect(Object.keys(env)).not.toContain("NEXT_PUBLIC_OIDC_CLIENT_SECRET");
    expect(Object.keys(env).some((key) => key.startsWith("NEXT_PUBLIC_"))).toBe(
      false,
    );
  });

  it("rejects_an_oidc_callback_url_that_bypasses_the_caddy_assertion_route", () => {
    expect(() =>
      loadWebServerEnv({
        NODE_ENV: "test",
        OIDC_ISSUER: "https://identity.example.com",
        OIDC_CLIENT_ID: "skinlab-web",
        OIDC_CLIENT_SECRET: "fake-client-secret",
        OIDC_REDIRECT_URI: "http://localhost:3000/auth/callback",
        OIDC_REQUIRED_ACR: "2",
        API_INTERNAL_BASE_URL: "https://api.internal:3001",
        BFF_EXCHANGE_HMAC_KEY: "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=",
        INTERNAL_TLS_CLIENT_CERT_PATH: "/run/secrets/bff-client-cert.pem",
        INTERNAL_TLS_CLIENT_KEY_PATH: "/run/secrets/bff-client-key.pem",
        INTERNAL_TLS_SERVER_CA_PATH: "/run/secrets/internal-server-ca.pem",
        SESSION_COOKIE_NAME: "skinlab_session",
        LOGIN_ATTEMPT_COOKIE_NAME: "skinlab_login_attempt",
      }),
    ).toThrow();
  });
});
