// All comments in this file are in English per project rules.

import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { PrismaService } from "../database/prisma.service";
import { type TransactionContext, TransactionManager } from "../database/transaction-manager";
import {
  CLINIC_TIMEZONE,
  JobAlreadyRunningError,
  type JobRun,
  parseClinicScheduledDate,
} from "./job-run.entity";
import { runScheduledJob } from "./run-scheduled-job";

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

describe("runScheduledJob Integration Tests", () => {
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

  beforeEach(async () => {
    await prisma.jobRun.deleteMany();
    await prisma.auditEvent.deleteMany();
  });

  it("Scenario 1 (Single Execution Lease): concurrent runs execute work callback exactly once", async () => {
    const scheduledFor = new Date("2026-11-12T12:00:00Z"); // 19:00 VN time
    const workFn = vi.fn().mockImplementation(async () => {
      // Simulate real processing latency
      await new Promise((r) => setTimeout(r, 50));
      return { processedCount: 10, noShowCount: 2 };
    });

    const [first, second] = await Promise.allSettled([
      runScheduledJob(prisma, "no-show-sweep", scheduledFor, workFn),
      runScheduledJob(prisma, "no-show-sweep", scheduledFor, workFn),
    ]);

    expect(workFn).toHaveBeenCalledTimes(1);

    const successfulResult: JobRun =
      first.status === "fulfilled"
        ? first.value
        : (second as PromiseFulfilledResult<JobRun>).value;
    expect(successfulResult).toMatchObject({
      jobName: "no-show-sweep",
      status: "COMPLETED",
      outcome: { processedCount: 10, noShowCount: 2 },
    });

    // The concurrent call either returns the completed result idempotently or throws JobAlreadyRunningError
    if (first.status === "rejected") {
      expect(first.reason).toBeInstanceOf(JobAlreadyRunningError);
    }
    if (second.status === "rejected") {
      expect(second.reason).toBeInstanceOf(JobAlreadyRunningError);
    }
  });

  it("Scenario 2 (Safe Idempotency): subsequent run returns cached completed outcome without re-executing work", async () => {
    const scheduledFor = new Date("2026-11-12T12:00:00Z");
    const workFn = vi.fn().mockResolvedValue({ processedCount: 5 });

    const run1 = await runScheduledJob(prisma, "session-cleanup", scheduledFor, workFn);
    expect(run1.status).toBe("COMPLETED");
    expect(workFn).toHaveBeenCalledTimes(1);

    const run2 = await runScheduledJob(prisma, "session-cleanup", scheduledFor, workFn);
    expect(run2.status).toBe("COMPLETED");
    expect(run2.id).toBe(run1.id);
    expect(run2.outcome).toEqual({ processedCount: 5 });
    expect(workFn).toHaveBeenCalledTimes(1); // not called again
  });

  it("Scenario 3 (Failure Handling & Safe Retry): failed work marks FAILED and allows safe retry", async () => {
    const scheduledFor = new Date("2026-11-12T12:30:00Z");
    let attemptCount = 0;

    const failingWork = vi.fn().mockImplementation(async () => {
      attemptCount++;
      if (attemptCount === 1) {
        throw new Error("Simulated database timeout during stocktake");
      }
      return { status: "recovered", itemsCount: 100 };
    });

    // First attempt fails
    await expect(
      runScheduledJob(prisma, "inventory-reconciliation", scheduledFor, failingWork),
    ).rejects.toThrow("Simulated database timeout during stocktake");

    const failedRecord = await prisma.jobRun.findUnique({
      where: {
        jobName_scheduledFor: {
          jobName: "inventory-reconciliation",
          scheduledFor,
        },
      },
    });
    expect(failedRecord?.status).toBe("FAILED");
    expect(failedRecord?.errorSummary).toContain("Simulated database timeout");

    // Second attempt recovers safely
    const retryResult = await runScheduledJob(
      prisma,
      "inventory-reconciliation",
      scheduledFor,
      failingWork,
    );
    expect(retryResult.status).toBe("COMPLETED");
    expect(retryResult.outcome).toEqual({ status: "recovered", itemsCount: 100 });
  });

  it("Scenario 4 (Concurrent Retry Concurrency Guard): concurrent retries only execute work once", async () => {
    const scheduledFor = new Date("2026-11-12T13:00:00Z");

    // Seed a failed job run
    await prisma.jobRun.create({
      data: {
        jobName: "failed-job-retry",
        scheduledFor,
        status: "FAILED",
        errorSummary: "Initial crash",
      },
    });

    const workFn = vi.fn().mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 50));
      return { retrySuccess: true };
    });

    const [first, second] = await Promise.allSettled([
      runScheduledJob(prisma, "failed-job-retry", scheduledFor, workFn),
      runScheduledJob(prisma, "failed-job-retry", scheduledFor, workFn),
    ]);

    // Atomic conditional update ensures only 1 worker wins the retry lease
    expect(workFn).toHaveBeenCalledTimes(1);
    const completedWinner: JobRun =
      first.status === "fulfilled"
        ? first.value
        : (second as PromiseFulfilledResult<JobRun>).value;
    expect(completedWinner.status).toBe("COMPLETED");
  });

  it("Scenario 5 (Timezone Invariance): resolves clinic timezone Asia/Ho_Chi_Minh correctly under UTC", async () => {
    // 19:00:00 in Asia/Ho_Chi_Minh (+07:00) is exactly 12:00:00 UTC
    expect(CLINIC_TIMEZONE).toBe("Asia/Ho_Chi_Minh");

    // Test with clinic local string without offset
    const resolvedFromLocalString = parseClinicScheduledDate("2026-11-12T19:00:00");
    expect(resolvedFromLocalString.toISOString()).toBe("2026-11-12T12:00:00.000Z");

    // Test with date + time parameters
    const resolvedFromDateAndTime = parseClinicScheduledDate("2026-11-12", "19:00:00");
    expect(resolvedFromDateAndTime.toISOString()).toBe("2026-11-12T12:00:00.000Z");

    const workFn = vi.fn().mockResolvedValue({ targetTimezone: "Asia/Ho_Chi_Minh" });
    const result = await runScheduledJob(
      prisma,
      "timezone-sweep-test",
      "2026-11-12T19:00:00",
      workFn,
    );

    expect(result.status).toBe("COMPLETED");
    expect(result.scheduledFor.toISOString()).toBe("2026-11-12T12:00:00.000Z");
  });

  it("Scenario 6 (Transaction Rollback on Work Failure): rolls back domain writes when work throws", async () => {
    const scheduledFor = new Date("2026-11-12T14:00:00Z");

    const failingTransactionWork = async (tx?: TransactionContext) => {
      if (tx) {
        await tx.auditEvent.create({
          data: {
            action: "job.temporary.action",
            entityType: "job_fixture",
            payload: { test: true },
          },
        });
      }
      throw new Error("Deliberate domain failure inside transaction");
    };

    await expect(
      runScheduledJob(prisma, "tx-rollback-test", scheduledFor, failingTransactionWork, {
        useTransaction: true,
        transactionManager,
      }),
    ).rejects.toThrow("Deliberate domain failure inside transaction");

    // Domain write was rolled back cleanly
    const auditCount = await prisma.auditEvent.count({
      where: { entityType: "job_fixture" },
    });
    expect(auditCount).toBe(0);

    // JobRun record was updated to FAILED outside the transaction
    const jobRecord = await prisma.jobRun.findUnique({
      where: {
        jobName_scheduledFor: {
          jobName: "tx-rollback-test",
          scheduledFor,
        },
      },
    });
    expect(jobRecord?.status).toBe("FAILED");
    expect(jobRecord?.errorSummary).toContain("Deliberate domain failure inside transaction");
  });
});
