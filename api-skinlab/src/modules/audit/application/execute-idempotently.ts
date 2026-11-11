import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";

import { Prisma } from "../../../generated/prisma/client";
import { PrismaService } from "../../../platform/database/prisma.service";
import type { TransactionContext } from "../../../platform/database/transaction-manager";

export const DEFAULT_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export type ExecuteIdempotentlyDependencies = {
  prisma: PrismaService | TransactionContext;
  ttlMs?: number;
  requestHash?: string;
  now?: () => Date;
};

export async function executeIdempotently<T>(
  scope: string,
  key: string,
  work: () => Promise<T>,
  dependencies: ExecuteIdempotentlyDependencies,
): Promise<T> {
  if (!scope || scope.trim().length === 0) {
    throw new Error("Idempotency scope cannot be empty.");
  }
  if (!key || key.trim().length === 0) {
    throw new Error("Idempotency key cannot be empty.");
  }

  const client = dependencies.prisma;
  const now = dependencies.now ? dependencies.now() : new Date();

  const existing = await client.idempotencyKey.findUnique({
    where: { scope_key: { scope, key } },
  });

  if (existing && existing.expiresAt > now && existing.responseStatus !== null) {
    if (dependencies.requestHash && existing.requestHash !== dependencies.requestHash) {
      throw new Error(
        "Idempotency key payload mismatch: the same key cannot be used with different request payloads.",
      );
    }
    return existing.responseBody as T;
  }

  const result = await work();

  const ttlMs = dependencies.ttlMs ?? DEFAULT_IDEMPOTENCY_TTL_MS;
  const expiresAt = new Date(now.getTime() + ttlMs);
  const requestHash =
    dependencies.requestHash ??
    createHash("sha256").update(`${scope}:${key}`).digest("hex");

  try {
    await client.idempotencyKey.upsert({
      where: { scope_key: { scope, key } },
      create: {
        scope,
        key,
        requestHash,
        responseStatus: 200,
        responseBody: (result as Prisma.InputJsonValue) ?? null,
        expiresAt,
      },
      update: {
        requestHash,
        responseStatus: 200,
        responseBody: (result as Prisma.InputJsonValue) ?? null,
        expiresAt,
      },
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const winner = await client.idempotencyKey.findUnique({
        where: { scope_key: { scope, key } },
      });
      if (winner && winner.responseStatus !== null) {
        return (winner.responseBody as T) ?? (result as T);
      }
    }
    throw error;
  }

  return result;
}

@Injectable()
export class ExecuteIdempotently {
  constructor(private readonly prisma: PrismaService) {}

  execute<T>(
    scope: string,
    key: string,
    work: () => Promise<T>,
    options?: {
      ttlMs?: number;
      requestHash?: string;
      tx?: TransactionContext;
      now?: () => Date;
    },
  ): Promise<T> {
    return executeIdempotently(scope, key, work, {
      prisma: options?.tx ?? this.prisma,
      ttlMs: options?.ttlMs,
      requestHash: options?.requestHash,
      now: options?.now,
    });
  }
}

