import { Injectable } from "@nestjs/common";

import type { TransactionContext } from "../../../platform/database/transaction-manager";
import type { AuditEvent, AuditEventInput } from "../domain/audit-event";
import { PrismaAuditRepository } from "../infrastructure/prisma-audit-repository";

@Injectable()
export class RecordAuditEvent {
  constructor(private readonly repository: PrismaAuditRepository) {}

  record(
    event: AuditEventInput,
    tx?: TransactionContext,
  ): Promise<AuditEvent> {
    return this.repository.create(event, tx);
  }

  execute(
    event: AuditEventInput,
    tx?: TransactionContext,
  ): Promise<AuditEvent> {
    return this.record(event, tx);
  }

  create(
    event: AuditEventInput,
    tx?: TransactionContext,
  ): Promise<AuditEvent> {
    return this.record(event, tx);
  }
}

/**
 * Functional helper for direct recording with repository or service and transaction context.
 */
export async function recordAuditEvent(
  repositoryOrService: PrismaAuditRepository | RecordAuditEvent,
  event: AuditEventInput,
  tx?: TransactionContext,
): Promise<AuditEvent> {
  if (repositoryOrService instanceof RecordAuditEvent) {
    return repositoryOrService.execute(event, tx);
  }
  return repositoryOrService.create(event, tx);
}
