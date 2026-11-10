import type { PrismaService } from "../../../platform/database/prisma.service";
import type { OidcLoginAttempt } from "../domain/oidc-login-attempt";

type CreateLoginAttemptRecord = Omit<OidcLoginAttempt, "id" | "consumedAt">;

export class LoginAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateLoginAttemptRecord): Promise<OidcLoginAttempt> {
    return this.prisma.oidcLoginAttempt.create({ data: input });
  }

  find(id: string): Promise<OidcLoginAttempt | null> {
    return this.prisma.oidcLoginAttempt.findUnique({ where: { id } });
  }

  async markConsumed(id: string, stateHash: string, now: Date): Promise<boolean> {
    const result = await this.prisma.oidcLoginAttempt.updateMany({
      where: {
        id,
        stateHash,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });

    return result.count === 1;
  }
}
