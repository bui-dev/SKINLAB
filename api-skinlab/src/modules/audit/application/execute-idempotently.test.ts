import { describe, expect, it, vi } from "vitest";

import { executeIdempotently, ExecuteIdempotently } from "./execute-idempotently";

describe("executeIdempotently unit tests", () => {
  it("throws when scope or key is empty", async () => {
    const mockPrisma = {} as never;
    const work = vi.fn();

    await expect(
      executeIdempotently("", "key-1", work, { prisma: mockPrisma }),
    ).rejects.toThrow("Idempotency scope cannot be empty.");

    await expect(
      executeIdempotently("scope", "", work, { prisma: mockPrisma }),
    ).rejects.toThrow("Idempotency key cannot be empty.");
  });

  it("returns cached result when valid unexpired key exists", async () => {
    const cachedResponse = { id: "rec-1", amount: 500000 };
    const now = new Date("2026-11-12T10:00:00Z");
    const future = new Date("2026-11-13T10:00:00Z");

    const mockPrisma = {
      idempotencyKey: {
        findUnique: vi.fn().mockResolvedValue({
          scope: "receipt.create",
          key: "k-1",
          requestHash: "hash-1",
          responseStatus: 200,
          responseBody: cachedResponse,
          expiresAt: future,
        }),
      },
    };

    const work = vi.fn().mockResolvedValue({ id: "rec-2", amount: 999999 });

    const result = await executeIdempotently("receipt.create", "k-1", work, {
      prisma: mockPrisma as never,
      now: () => now,
      requestHash: "hash-1",
    });

    expect(result).toEqual(cachedResponse);
    expect(work).not.toHaveBeenCalled();
  });

  it("throws when requestHash does not match existing key payload", async () => {
    const now = new Date("2026-11-12T10:00:00Z");
    const future = new Date("2026-11-13T10:00:00Z");

    const mockPrisma = {
      idempotencyKey: {
        findUnique: vi.fn().mockResolvedValue({
          scope: "receipt.create",
          key: "k-1",
          requestHash: "original-hash",
          responseStatus: 200,
          responseBody: { ok: true },
          expiresAt: future,
        }),
      },
    };

    const work = vi.fn();

    await expect(
      executeIdempotently("receipt.create", "k-1", work, {
        prisma: mockPrisma as never,
        now: () => now,
        requestHash: "different-hash",
      }),
    ).rejects.toThrow("Idempotency key payload mismatch");

    expect(work).not.toHaveBeenCalled();
  });

  it("executes work and upserts idempotency key when no cached key exists", async () => {
    const now = new Date("2026-11-12T10:00:00Z");
    const expectedResult = { orderId: "ORD-999" };

    const mockPrisma = {
      idempotencyKey: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({}),
      },
    };

    const work = vi.fn().mockResolvedValue(expectedResult);

    const result = await executeIdempotently("order.place", "order-key-99", work, {
      prisma: mockPrisma as never,
      now: () => now,
      ttlMs: 3600000,
    });

    expect(result).toEqual(expectedResult);
    expect(work).toHaveBeenCalledTimes(1);
    expect(mockPrisma.idempotencyKey.upsert).toHaveBeenCalledWith({
      where: { scope_key: { scope: "order.place", key: "order-key-99" } },
      create: expect.objectContaining({
        scope: "order.place",
        key: "order-key-99",
        responseStatus: 200,
        responseBody: expectedResult,
        expiresAt: new Date("2026-11-12T11:00:00Z"),
      }),
      update: expect.objectContaining({
        responseStatus: 200,
        responseBody: expectedResult,
        expiresAt: new Date("2026-11-12T11:00:00Z"),
      }),
    });
  });

  it("supports ExecuteIdempotently injectable service class", async () => {
    const mockPrisma = {
      idempotencyKey: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({}),
      },
    };

    const service = new ExecuteIdempotently(mockPrisma as never);
    const work = vi.fn().mockResolvedValue({ status: "done" });

    const result = await service.execute("task.run", "key-svc", work);
    expect(result).toEqual({ status: "done" });
    expect(work).toHaveBeenCalledTimes(1);
  });
});
