import { Injectable } from "@nestjs/common";

import type { Prisma } from "../../generated/prisma/client";

import { PrismaService } from "./prisma.service";

export type TransactionContext = Prisma.TransactionClient;

@Injectable()
export class TransactionManager {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => work(tx));
  }
}
