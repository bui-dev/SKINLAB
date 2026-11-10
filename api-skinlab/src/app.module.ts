import { Module } from "@nestjs/common";

import { HealthModule } from "./health/health.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { DatabaseModule } from "./platform/database/database.module";

@Module({
  imports: [HealthModule, DatabaseModule, IdentityModule],
})
export class AppModule {}
