import { Module } from "@nestjs/common";

import { loadEnv } from "../../config/env";

import { PrismaService } from "./prisma.service";
import { TransactionManager } from "./transaction-manager";

@Module({
  providers: [
    {
      provide: PrismaService,
      useFactory: () => new PrismaService(loadEnv(process.env).DATABASE_URL),
    },
    TransactionManager,
  ],
  exports: [PrismaService, TransactionManager],
})
export class DatabaseModule {}
