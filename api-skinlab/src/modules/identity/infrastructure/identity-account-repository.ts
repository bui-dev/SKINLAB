import type { Role } from "@skinlab/contracts";
import type { PrismaService } from "../../../platform/database/prisma.service";

export class IdentityAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  find(subject: string) {
    return this.prisma.identityAccount.findUnique({ where: { subject } });
  }
  async provision(subject: string, role: Role) {
    return this.prisma.identityAccount.upsert({
      where: { subject },
      create: { subject, role },
      update: {},
    });
  }
}
