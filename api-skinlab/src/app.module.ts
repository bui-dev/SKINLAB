import { Module } from "@nestjs/common";

import { HealthModule } from "./health/health.module";
import { AuditModule } from "./modules/audit/audit.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { MediaModule } from "./modules/media/media.module";
import { DatabaseModule } from "./platform/database/database.module";
import { JobsModule } from "./platform/jobs/jobs.module";

@Module({
  imports: [HealthModule, DatabaseModule, IdentityModule, AuditModule, MediaModule, JobsModule],
})
export class AppModule {}
