import { Injectable } from "@nestjs/common";

import type { Prisma } from "../../../generated/prisma/client";
import type { PrismaService } from "../../../platform/database/prisma.service";
import type { TransactionContext } from "../../../platform/database/transaction-manager";
import {
  type AuditEvent,
  type AuditEventInput,
  sanitizeAuditPayload,
} from "../domain/audit-event";

@Injectable()
export class PrismaAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record an immutable audit event (Append-Only).
   * Notice: Intentionally no update, delete, or deleteMany methods are provided.
   */
  async create(
    input: AuditEventInput,
    tx?: TransactionContext,
  ): Promise<AuditEvent> {
    const validated = sanitizeAuditPayload(input);
    const client = tx ?? this.prisma;

    const payloadToStore: Prisma.InputJsonValue = {
      actor: {
        subject: validated.actor.subject,
        role: validated.actor.role,
        accessContext: validated.actor.accessContext,
        deviceFingerprint: validated.actor.deviceFingerprint,
      },
      correlationId: validated.correlationId ?? null,
      metadata: (validated.metadata as Prisma.InputJsonObject) ?? {},
      before: (validated.before as Prisma.InputJsonObject) ?? null,
      after: (validated.after as Prisma.InputJsonObject) ?? null,
    };

    const record = await client.auditEvent.create({
      data: {
        action: validated.action,
        entityType: validated.entityType,
        entityId: validated.entityId ?? null,
        payload: payloadToStore,
      },
    });

    return {
      id: record.id,
      action: record.action,
      entityType: record.entityType,
      entityId: record.entityId,
      payload: record.payload as Record<string, unknown>,
      createdAt: record.createdAt,
    };
  }

  async findById(id: string, tx?: TransactionContext): Promise<AuditEvent | null> {
    const client = tx ?? this.prisma;
    const record = await client.auditEvent.findUnique({ where: { id } });
    if (!record) return null;
    return {
      id: record.id,
      action: record.action,
      entityType: record.entityType,
      entityId: record.entityId,
      payload: record.payload as Record<string, unknown>,
      createdAt: record.createdAt,
    };
  }
}

