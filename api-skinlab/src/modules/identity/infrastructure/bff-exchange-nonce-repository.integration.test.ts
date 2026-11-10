import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";

import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PrismaService } from "../../../platform/database/prisma.service";

import { BffExchangeNonceRepository } from "./bff-exchange-nonce-repository";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const prismaCliPath = require.resolve("prisma/build/index.js");
const apiRoot = new URL("../../../../", import.meta.url).pathname;

async function migrateDatabase(databaseUrl: string): Promise<void> {
  await execFileAsync(process.execPath, [prismaCliPath, "migrate", "deploy"], {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

describe("BffExchangeNonceRepository", () => {
  let database: StartedPostgreSqlContainer;
  let prisma: PrismaService;
  let repository: BffExchangeNonceRepository;

  beforeAll(async () => {
    database = await new PostgreSqlContainer("postgres:17-alpine")
      .withDatabase("skinlab")
      .withUsername("skinlab")
      .withPassword("skinlab")
      .start();
    await migrateDatabase(database.getConnectionUri());
    prisma = new PrismaService(database.getConnectionUri());
    repository = new BffExchangeNonceRepository(prisma);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await database?.stop();
  });

  it("consumes_a_nonce_once_until_expiry", async () => {
    const expiry = new Date("2026-11-10T09:05:00.000Z");
    await expect(repository.consume("nonce-01", expiry)).resolves.toBe(true);
    await expect(repository.consume("nonce-01", expiry)).resolves.toBe(false);
  });
});
