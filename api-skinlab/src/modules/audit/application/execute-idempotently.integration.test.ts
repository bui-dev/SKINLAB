import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";

import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaService } from "../../../platform/database/prisma.service";
import { TransactionManager } from "../../../platform/database/transaction-manager";
import { AuditSecurityViolationError } from "../domain/audit-event";
import { PrismaAuditRepository } from "../infrastructure/prisma-audit-repository";
import { executeIdempotently } from "./execute-idempotently";
import { recordAuditEvent } from "./record-audit-event";

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

describe("Audit & Idempotency Integration Tests", () => {
  let database: StartedPostgreSqlContainer;
  let prisma: PrismaService;
  let transactionManager: TransactionManager;
  let auditRepository: PrismaAuditRepository;

  beforeAll(async () => {
    database = await new PostgreSqlContainer("postgres:17-alpine")
      .withDatabase("skinlab")
      .withUsername("skinlab")
      .withPassword("skinlab")
      .start();

    await migrateDatabase(database.getConnectionUri());
    prisma = new PrismaService(database.getConnectionUri());
    transactionManager = new TransactionManager(prisma);
    auditRepository = new PrismaAuditRepository(prisma);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await database?.stop();
  });

  beforeEach(async () => {
    await prisma.auditEvent.deleteMany({});
    await prisma.idempotencyKey.deleteMany({});
  });

  it("Scenario 1 (Immutability): repository only provides create and findById, and rejects update/delete", async () => {
    expect((auditRepository as unknown as Record<string, unknown>).update).toBeUndefined();
    expect((auditRepository as unknown as Record<string, unknown>).delete).toBeUndefined();
    expect((auditRepository as unknown as Record<string, unknown>).deleteMany).toBeUndefined();

    const event = await auditRepository.create({
      action: "appointment.check_in",
      entityType: "appointment",
      entityId: "app-001",
      actor: {
        subject: "staff-01",
        role: "receptionist",
        accessContext: "clinic",
        deviceFingerprint: "sha256:cert-reception-01",
      },
      metadata: { reason: "patient check-in on time" },
    });

    expect(event.id).toBeDefined();
    const found = await auditRepository.findById(event.id);
    expect(found).not.toBeNull();
    expect(found?.action).toBe("appointment.check_in");
  });

  it("Scenario 2 (Safe Idempotency): retry returns cached result without running work or domain writes a second time", async () => {
    let workExecutionCount = 0;

    const work = async () => {
      workExecutionCount += 1;
      await recordAuditEvent(auditRepository, {
        action: "payment.receipt.issued",
        entityType: "receipt",
        entityId: "rec-888",
        actor: {
          subject: "receptionist-01",
          role: "receptionist",
          accessContext: "clinic",
          deviceFingerprint: "sha256:cert-fp-1",
        },
        metadata: { amount: 1500000 },
      });
      return { receiptNo: "REC-2026-0001", status: "confirmed" };
    };

    // First invocation
    const result1 = await executeIdempotently("payment.receipt", "idem-rec-1", work, { prisma });
    expect(result1).toEqual({ receiptNo: "REC-2026-0001", status: "confirmed" });
    expect(workExecutionCount).toBe(1);
    expect(await prisma.auditEvent.count()).toBe(1);

    // Second invocation with same scope and key (Retry)
    const result2 = await executeIdempotently("payment.receipt", "idem-rec-1", work, { prisma });
    expect(result2).toEqual({ receiptNo: "REC-2026-0001", status: "confirmed" });
    expect(workExecutionCount).toBe(1); // WORK MUST NOT RUN AGAIN
    expect(await prisma.auditEvent.count()).toBe(1); // AUDIT EVENT COUNT STAYS 1
  });

  it("Scenario 3 (Atomicity with TransactionManager): rollback leaves no orphaned audit event, commit succeeds atomically", async () => {
    // Test Rollback branch
    await expect(
      transactionManager.run(async (tx) => {
        await auditRepository.create(
          {
            action: "inventory.deduct.failed",
            entityType: "inventory_batch",
            entityId: "batch-99",
            actor: {
              subject: "doctor-01",
              role: "doctor",
              accessContext: "clinic",
              deviceFingerprint: "sha256:cert-doc-01",
            },
          },
          tx,
        );

        throw new Error("force atomicity rollback");
      }),
    ).rejects.toThrow("force atomicity rollback");

    expect(await prisma.auditEvent.count()).toBe(0);

    // Test Commit branch
    await transactionManager.run(async (tx) => {
      await auditRepository.create(
        {
          action: "inventory.deduct.success",
          entityType: "inventory_batch",
          entityId: "batch-100",
          actor: {
            subject: "doctor-01",
            role: "doctor",
            accessContext: "clinic",
            deviceFingerprint: "sha256:cert-doc-01",
          },
        },
        tx,
      );
    });

    expect(await prisma.auditEvent.count({ where: { entityId: "batch-100" } })).toBe(1);
  });

  it("Scenario 4 (Security & Context Protection): captures context and rejects secrets, arrays with secrets, and raw images", async () => {
    // Rejection of sensitive token in metadata
    await expect(
      auditRepository.create({
        action: "user.auth.refresh",
        entityType: "session",
        actor: {
          subject: "admin-01",
          role: "admin",
          accessContext: "remote",
          deviceFingerprint: "sha256:cert-admin",
        },
        metadata: { refreshToken: "sensitive-jwt-token" },
      }),
    ).rejects.toThrow(AuditSecurityViolationError);

    // Rejection of sensitive token inside an array of objects
    await expect(
      auditRepository.create({
        action: "user.auth.batch",
        entityType: "session",
        actor: {
          subject: "admin-01",
          role: "admin",
          accessContext: "remote",
          deviceFingerprint: "sha256:cert-admin",
        },
        metadata: { tokens: [{ password: "super-secret-password" }] },
      }),
    ).rejects.toThrow(AuditSecurityViolationError);

    // Rejection of raw clinical image data
    await expect(
      auditRepository.create({
        action: "clinical.image.upload",
        entityType: "clinical_record",
        actor: {
          subject: "doctor-01",
          role: "doctor",
          accessContext: "clinic",
          deviceFingerprint: "sha256:cert-doc-01",
        },
        metadata: { image: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..." },
      }),
    ).rejects.toThrow(AuditSecurityViolationError);
  });
});

