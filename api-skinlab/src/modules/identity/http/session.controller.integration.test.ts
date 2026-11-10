import { execFile } from "node:child_process";
import { createHmac, createHash } from "node:crypto";
import { createRequire } from "node:module";
import { promisify } from "node:util";

import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../../../app.module";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const prismaCliPath = require.resolve("prisma/build/index.js");
const apiRoot = new URL("../../../../", import.meta.url).pathname;
const bffKey = Buffer.alloc(32, 3).toString("base64");

async function migrateDatabase(databaseUrl: string): Promise<void> {
  await execFileAsync(process.execPath, [prismaCliPath, "migrate", "deploy"], {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

function bffHeaders(body: string) {
  const issuedAt = new Date().toISOString();
  const nonce = "controller-nonce-01";
  const bodyHash = createHash("sha256").update(body).digest("hex");
  const signature = createHmac("sha256", Buffer.from(bffKey, "base64"))
    .update(["POST", "/internal/login-attempts", bodyHash, issuedAt, nonce].join("\n"))
    .digest("base64url");

  return {
    "x-skinlab-issued-at": issuedAt,
    "x-skinlab-nonce": nonce,
    "x-skinlab-signature": signature,
  };
}

describe("SessionController HTTP boundary", () => {
  let database: StartedPostgreSqlContainer;
  let app: NestFastifyApplication;

  beforeAll(async () => {
    database = await new PostgreSqlContainer("postgres:17-alpine")
      .withDatabase("skinlab")
      .withUsername("skinlab")
      .withPassword("skinlab")
      .start();
    await migrateDatabase(database.getConnectionUri());
    Object.assign(process.env, {
      NODE_ENV: "test",
      DATABASE_URL: database.getConnectionUri(),
      S3_ENDPOINT: "http://localhost:9000",
      S3_REGION: "us-east-1",
      S3_BUCKET: "skinlab-private",
      S3_ACCESS_KEY_ID: "skinlab",
      S3_SECRET_ACCESS_KEY: "fake-secret-for-local-tests",
      CLINIC_TIMEZONE: "Asia/Ho_Chi_Minh",
      OIDC_ISSUER: "https://identity.example.com",
      OIDC_JWKS_URL: "https://identity.example.com/jwks.json",
      OIDC_AUDIENCE: "skinlab-api",
      OIDC_REQUIRED_ACR: "2",
      TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
      BFF_EXCHANGE_HMAC_KEY: bffKey,
      GATEWAY_ASSERTION_HMAC_KEY: Buffer.alloc(32, 4).toString("base64"),
      INTERNAL_TLS_CERT_PATH: "/run/secrets/api-cert.pem",
      INTERNAL_TLS_KEY_PATH: "/run/secrets/api-key.pem",
      INTERNAL_TLS_CLIENT_CA_PATH: "/run/secrets/caddy-client-ca.pem",
      GATEWAY_CLIENT_CERT_FINGERPRINT:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    });
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(),
      { logger: false },
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await database?.stop();
  });

  it("creates_one_login_attempt_and_rejects_a_replayed_bff_request", async () => {
    const payload = JSON.stringify({
      state: "state-01",
      nonce: "oidc-nonce-01",
      codeVerifier: "pkce-verifier-01",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    const headers = bffHeaders(payload);

    const first = await app.inject({
      method: "POST",
      url: "/internal/login-attempts",
      payload,
      headers: { ...headers, "content-type": "application/json" },
    });
    const replay = await app.inject({
      method: "POST",
      url: "/internal/login-attempts",
      payload,
      headers: { ...headers, "content-type": "application/json" },
    });

    expect(first.statusCode, first.body).toBe(201);
    expect(first.json()).toMatchObject({ attemptId: expect.any(String) });
    expect(replay.statusCode).toBe(403);
  });
});
