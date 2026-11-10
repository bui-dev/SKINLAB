import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";

import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PrismaService } from "./prisma.service";
import { TransactionManager } from "./transaction-manager";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const prismaCliPath = require.resolve("prisma/build/index.js");
const apiRoot = new URL("../../../", import.meta.url).pathname;

async function migrateDatabase(databaseUrl: string): Promise<void> {
  await execFileAsync(process.execPath, [prismaCliPath, "migrate", "deploy"], {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

describe("TransactionManager", () => {
  let database: StartedPostgreSqlContainer;
  let prisma: PrismaService;
  let transactionManager: TransactionManager;

  beforeAll(async () => {
    database = await new PostgreSqlContainer("postgres:17-alpine")
      .withDatabase("skinlab")
      .withUsername("skinlab")
      .withPassword("skinlab")
      .start();

    await migrateDatabase(database.getConnectionUri());
    prisma = new PrismaService(database.getConnectionUri());
    transactionManager = new TransactionManager(prisma);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await database?.stop();
  });

  it("rolls back the fixture audit event when work throws", async () => {
    await expect(
      transactionManager.run(async (tx) => {
        await tx.auditEvent.create({
          data: {
            action: "test.transaction.rollback",
            entityType: "fixture",
            entityId: "rollback-fixture",
            payload: { source: "transaction-manager.integration.test" },
          },
        });

        throw new Error("force rollback");
      }),
    ).rejects.toThrow("force rollback");

    await expect(
      prisma.auditEvent.count({
        where: { entityId: "rollback-fixture" },
      }),
    ).resolves.toBe(0);
  });
});
