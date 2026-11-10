import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../app.module";
import { loadEnv } from "../config/env";

const validApiEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://skinlab:skinlab@localhost:5432/skinlab",
  S3_ENDPOINT: "http://localhost:9000",
  S3_REGION: "us-east-1",
  S3_BUCKET: "skinlab-private",
  S3_ACCESS_KEY_ID: "skinlab",
  S3_SECRET_ACCESS_KEY: "fake-secret-for-local-tests",
  CLINIC_TIMEZONE: "Asia/Ho_Chi_Minh",
  OIDC_ISSUER: "https://identity.example.com",
  OIDC_AUDIENCE: "skinlab-api",
  OIDC_REQUIRED_ACR: "2",
  TOKEN_ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  BFF_EXCHANGE_HMAC_KEY: "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=",
  INTERNAL_TLS_CERT_PATH: "/run/secrets/api-cert.pem",
  INTERNAL_TLS_KEY_PATH: "/run/secrets/api-key.pem",
  INTERNAL_TLS_CLIENT_CA_PATH: "/run/secrets/caddy-client-ca.pem",
  GATEWAY_CLIENT_CERT_FINGERPRINT:
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
} satisfies NodeJS.ProcessEnv;

describe("HealthController", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(),
      { logger: false },
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns_liveness_without_external_dependencies", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health/live",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("reports readiness using named checks", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health/ready",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ready", checks: {} });
  });
});

describe("loadEnv", () => {
  it("rejects_missing_database_url", () => {
    const input: NodeJS.ProcessEnv = { ...validApiEnv };
    delete input.DATABASE_URL;

    expect(() => loadEnv(input)).toThrow();
  });

  it("rejects_missing_auth_encryption_or_internal_tls_configuration", () => {
    const requiredKeys = [
      "OIDC_ISSUER",
      "OIDC_AUDIENCE",
      "TOKEN_ENCRYPTION_KEY",
      "BFF_EXCHANGE_HMAC_KEY",
      "INTERNAL_TLS_CERT_PATH",
      "INTERNAL_TLS_KEY_PATH",
      "INTERNAL_TLS_CLIENT_CA_PATH",
      "GATEWAY_CLIENT_CERT_FINGERPRINT",
    ] as const;

    for (const key of requiredKeys) {
      expect(() => loadEnv({ ...validApiEnv, [key]: undefined })).toThrow();
    }
  });
});
