import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PrismaService } from "../../../platform/database/prisma.service";
import { GatewayAssertionRepository } from "./gateway-assertion-repository";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const prismaCliPath = require.resolve("prisma/build/index.js");
const apiRoot = new URL("../../../../", import.meta.url).pathname;

describe("GatewayAssertionRepository", () => {
  let database: StartedPostgreSqlContainer;
  let prisma: PrismaService;

  beforeAll(async () => {
    database = await new PostgreSqlContainer("postgres:17-alpine").start();
    await execFileAsync(process.execPath, [prismaCliPath, "migrate", "deploy"], {
      cwd: apiRoot,
      env: { ...process.env, DATABASE_URL: database.getConnectionUri() },
    });
    prisma = new PrismaService(database.getConnectionUri());
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await database?.stop();
  });

  it("consumes_a_gateway_assertion_once_across_repository_instances", async () => {
    const expiry = new Date("2026-11-10T09:01:00.000Z");
    await expect(new GatewayAssertionRepository(prisma).consume("assertion-01", expiry)).resolves.toBe(true);
    await expect(new GatewayAssertionRepository(prisma).consume("assertion-01", expiry)).resolves.toBe(false);
  });
});
