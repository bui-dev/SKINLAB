import { Prisma } from "../../../generated/prisma/client";
import type { PrismaService } from "../../../platform/database/prisma.service";

import { hashOpaqueValue } from "./identity-crypto";

export class BffExchangeNonceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async consume(nonce: string, expiresAt: Date): Promise<boolean> {
    try {
      await this.prisma.bffExchangeNonce.create({
        data: { nonceHash: hashOpaqueValue(nonce), expiresAt },
      });
      return true;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return false;
      }
      throw error;
    }
  }
}
