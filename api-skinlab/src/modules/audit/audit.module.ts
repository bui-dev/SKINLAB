import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../platform/database/database.module";
import { PrismaService } from "../../platform/database/prisma.service";

import { ExecuteIdempotently } from "./application/execute-idempotently";
import { RecordAuditEvent } from "./application/record-audit-event";
import { PrismaAuditRepository } from "./infrastructure/prisma-audit-repository";

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: PrismaAuditRepository,
      useFactory: (prisma: PrismaService) => new PrismaAuditRepository(prisma),
      inject: [PrismaService],
    },
    RecordAuditEvent,
    ExecuteIdempotently,
  ],
  exports: [
    PrismaAuditRepository,
    RecordAuditEvent,
    ExecuteIdempotently,
  ],
})
export class AuditModule {}

