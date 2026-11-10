import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";

import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PrismaService } from "../../../platform/database/prisma.service";
import { LoginAttemptRepository } from "../infrastructure/prisma-login-attempt-repository";

import { ConsumeLoginAttempt } from "./consume-login-attempt";
import { CreateLoginAttempt } from "./create-login-attempt";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const prismaCliPath = require.resolve("prisma/build/index.js");
const apiRoot = new URL("../../../../", import.meta.url).pathname;
const encryptionKey = Buffer.alloc(32, 1).toString("base64");

async function migrateDatabase(databaseUrl: string): Promise<void> {
  await execFileAsync(process.execPath, [prismaCliPath, "migrate", "deploy"], {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

describe("LoginAttempt lifecycle", () => {
  let database: StartedPostgreSqlContainer;
  let prisma: PrismaService;
  let createLoginAttempt: CreateLoginAttempt;
  let consumeLoginAttempt: ConsumeLoginAttempt;

  beforeAll(async () => {
    database = await new PostgreSqlContainer("postgres:17-alpine")
      .withDatabase("skinlab")
      .withUsername("skinlab")
      .withPassword("skinlab")
      .start();
    await migrateDatabase(database.getConnectionUri());
    prisma = new PrismaService(database.getConnectionUri());
    const repository = new LoginAttemptRepository(prisma);
    createLoginAttempt = new CreateLoginAttempt(repository, encryptionKey);
    consumeLoginAttempt = new ConsumeLoginAttempt(repository, encryptionKey);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await database?.stop();
  });

  it("creates_and_consumes_a_login_attempt_exactly_once", async () => {
    const created = await createLoginAttempt.execute({
      state: "state-01",
      nonce: "nonce-01",
      codeVerifier: "pkce-verifier-01",
      expiresAt: new Date("2026-11-10T10:00:00.000Z"),
    });

    await expect(
      consumeLoginAttempt.execute(created.attemptId, "state-01", new Date("2026-11-10T09:00:00.000Z")),
    ).resolves.toMatchObject({
      nonceHash: expect.any(String),
      codeVerifier: "pkce-verifier-01",
    });
    await expect(
      consumeLoginAttempt.execute(created.attemptId, "state-01", new Date("2026-11-10T09:01:00.000Z")),
    ).rejects.toThrow("consumed");
  });

  it("rejects_a_wrong_state_or_an_expired_attempt", async () => {
    const created = await createLoginAttempt.execute({
      state: "state-02",
      nonce: "nonce-02",
      codeVerifier: "pkce-verifier-02",
      expiresAt: new Date("2026-11-10T10:00:00.000Z"),
    });

    await expect(
      consumeLoginAttempt.execute(created.attemptId, "wrong-state", new Date("2026-11-10T09:00:00.000Z")),
    ).rejects.toThrow("state");
    await expect(
      consumeLoginAttempt.execute(created.attemptId, "state-02", new Date("2026-11-10T10:00:00.000Z")),
    ).rejects.toThrow("expired");
  });
});
