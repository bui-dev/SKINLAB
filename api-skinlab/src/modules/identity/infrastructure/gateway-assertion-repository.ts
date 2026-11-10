import { Prisma } from "../../../generated/prisma/client";
import type { PrismaService } from "../../../platform/database/prisma.service";
import { hashOpaqueValue } from "./identity-crypto";

export class GatewayAssertionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async consume(id: string, expiresAt: Date): Promise<boolean> {
    try {
      await this.prisma.gatewayAssertionNonce.create({
        data: { nonceHash: hashOpaqueValue(id), expiresAt },
      });
      return true;
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
      throw error;
    }
  }
}
