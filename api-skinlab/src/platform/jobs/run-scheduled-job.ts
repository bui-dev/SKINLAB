// All comments in this file are in English per project rules.

import { Injectable, Optional } from "@nestjs/common";

import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../database/prisma.service";
import {
  type TransactionContext,
  TransactionManager,
} from "../database/transaction-manager";
import {
  DEFAULT_LEASE_TIMEOUT_MS,
  JobAlreadyRunningError,
  type JobResult,
  type JobRunEntity,
  parseClinicScheduledDate,
} from "./job-run.entity";

export type RunScheduledJobOptions = {
  leaseTimeoutMs?: number;
  allowRetryOnFailure?: boolean;
  useTransaction?: boolean;
  transactionManager?: TransactionManager;
};

export async function runScheduledJob<T extends JobResult = JobResult>(
  prisma: PrismaService,
  jobName: string,
  scheduledFor: Date | string,
  work: (tx?: TransactionContext) => Promise<T>,
  options?: RunScheduledJobOptions,
): Promise<JobRunEntity<T>> {
  if (!jobName || jobName.trim().length === 0) {
    throw new Error("Job name cannot be empty.");
  }

  const normalizedScheduledFor = parseClinicScheduledDate(scheduledFor);
  const leaseTimeoutMs = options?.leaseTimeoutMs ?? DEFAULT_LEASE_TIMEOUT_MS;
  const allowRetryOnFailure = options?.allowRetryOnFailure ?? true;
  const now = new Date();

  let jobRunRecord: {
    id: string;
    jobName: string;
    scheduledFor: Date;
    startedAt: Date;
    finishedAt: Date | null;
    status: string;
    outcome: Prisma.JsonValue | null;
    errorSummary: string | null;
    createdAt: Date;
    updatedAt: Date;
  };

  try {
    // Attempt atomic insertion to claim the initial lease
    jobRunRecord = await prisma.jobRun.create({
      data: {
        jobName,
        scheduledFor: normalizedScheduledFor,
        status: "RUNNING",
        startedAt: now,
      },
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Existing record detected: evaluate whether lease is active, completed, or eligible for retry
      const existing = await prisma.jobRun.findUnique({
        where: {
          jobName_scheduledFor: {
            jobName,
            scheduledFor: normalizedScheduledFor,
          },
        },
      });

      if (!existing) {
        throw error;
      }

      // If already completed successfully, return cached result idempotently
      if (existing.status === "COMPLETED") {
        return {
          id: existing.id,
          jobName: existing.jobName,
          scheduledFor: existing.scheduledFor,
          startedAt: existing.startedAt,
          finishedAt: existing.finishedAt,
          status: "COMPLETED",
          outcome: existing.outcome as T | null,
          errorSummary: existing.errorSummary,
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
        };
      }

      // If currently running and lease is still fresh, reject duplicate invocation
      const leaseAgeMs = now.getTime() - existing.startedAt.getTime();
      if (existing.status === "RUNNING" && leaseAgeMs < leaseTimeoutMs) {
        throw new JobAlreadyRunningError(jobName, normalizedScheduledFor);
      }

      // If failed or stale lease, acquire lease atomically via conditional update
      if (
        (existing.status === "FAILED" && allowRetryOnFailure) ||
        (existing.status === "RUNNING" && leaseAgeMs >= leaseTimeoutMs)
      ) {
        const leaseCutoff = new Date(now.getTime() - leaseTimeoutMs);
        const updateResult = await prisma.jobRun.updateMany({
          where: {
            id: existing.id,
            OR: [
              { status: "FAILED" },
              { status: "RUNNING", startedAt: { lte: leaseCutoff } },
            ],
          },
          data: {
            status: "RUNNING",
            startedAt: now,
            finishedAt: null,
            errorSummary: null,
          },
        });

        // Concurrency guard: if count === 0, another concurrent worker won the race
        if (updateResult.count === 0) {
          throw new JobAlreadyRunningError(jobName, normalizedScheduledFor);
        }

        const reloaded = await prisma.jobRun.findUnique({
          where: { id: existing.id },
        });
        if (!reloaded) {
          throw error;
        }
        jobRunRecord = reloaded;
      } else {
        throw new Error(
          `Cannot execute job "${jobName}" in state "${existing.status}" without retry permission.`,
        );
      }
    } else {
      throw error;
    }
  }

  // Execute work callback safely, optionally inside a managed transaction
  try {
    let outcome: T;
    const txManager = options?.transactionManager;

    if (options?.useTransaction && txManager) {
      outcome = await txManager.run((tx) => work(tx));
    } else {
      outcome = await work();
    }

    const finishedAt = new Date();
    const completed = await prisma.jobRun.update({
      where: { id: jobRunRecord.id },
      data: {
        status: "COMPLETED",
        finishedAt,
        outcome: outcome === undefined ? Prisma.DbNull : (outcome as Prisma.InputJsonValue),
      },
    });

    return {
      id: completed.id,
      jobName: completed.jobName,
      scheduledFor: completed.scheduledFor,
      startedAt: completed.startedAt,
      finishedAt: completed.finishedAt,
      status: "COMPLETED",
      outcome: completed.outcome as T | null,
      errorSummary: completed.errorSummary,
      createdAt: completed.createdAt,
      updatedAt: completed.updatedAt,
    };
  } catch (workError: unknown) {
    const finishedAt = new Date();
    const errorSummary =
      workError instanceof Error ? workError.message : String(workError);

    await prisma.jobRun.update({
      where: { id: jobRunRecord.id },
      data: {
        status: "FAILED",
        finishedAt,
        errorSummary,
      },
    });

    throw workError;
  }
}

@Injectable()
export class RunScheduledJob {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly transactionManager?: TransactionManager,
  ) {}

  execute<T extends JobResult = JobResult>(
    jobName: string,
    scheduledFor: Date | string,
    work: (tx?: TransactionContext) => Promise<T>,
    options?: RunScheduledJobOptions,
  ): Promise<JobRunEntity<T>> {
    return runScheduledJob(this.prisma, jobName, scheduledFor, work, {
      transactionManager: options?.transactionManager ?? this.transactionManager,
      ...options,
    });
  }
}

