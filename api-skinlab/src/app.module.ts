import { Module } from "@nestjs/common";

import { HealthModule } from "./health/health.module";
import { DatabaseModule } from "./platform/database/database.module";

@Module({
  imports: [HealthModule, DatabaseModule],
})
export class AppModule {}
