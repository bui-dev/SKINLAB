// All comments in this file are in English per project rules.

import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { RunScheduledJob } from "./run-scheduled-job";

@Module({
  imports: [DatabaseModule],
  providers: [RunScheduledJob],
  exports: [RunScheduledJob],
})
export class JobsModule {}

