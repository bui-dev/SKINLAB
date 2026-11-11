import { Module } from "@nestjs/common";

import { HealthModule } from "./health/health.module";
import { AuditModule } from "./modules/audit/audit.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { DatabaseModule } from "./platform/database/database.module";

@Module({
  imports: [HealthModule, DatabaseModule, IdentityModule, AuditModule],
})
export class AppModule {}
