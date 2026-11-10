import type { PrismaService } from "../../../platform/database/prisma.service";

type SessionRecord = {
  id: string;
  sessionIdHash: string;
  subject: string;
  role: string;
  acr: string;
  deviceFingerprint: string;
  accessContext: string;
  refreshTokenHash: string;
  refreshTokenCiphertext: string;
  expiresAt: Date;
  absoluteExpiresAt: Date;
  lastActivityAt: Date;
  refreshStartedAt: Date | null;
  revokedAt: Date | null;
};

type CreateSessionRecord = Omit<SessionRecord, "id" | "revokedAt">;

export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateSessionRecord): Promise<SessionRecord> {
    return this.prisma.userSession.create({ data: input });
  }

  find(sessionIdHash: string): Promise<SessionRecord | null> {
    return this.prisma.userSession.findUnique({ where: { sessionIdHash } });
  }

  async beginRefresh(sessionIdHash: string, now: Date): Promise<boolean> {
    const result = await this.prisma.userSession.updateMany({
      where: { sessionIdHash, revokedAt: null, refreshStartedAt: null },
      data: { refreshStartedAt: now },
    });
    return result.count === 1;
  }

  async touch(sessionIdHash: string, now: Date): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { sessionIdHash, revokedAt: null, refreshStartedAt: null },
      data: { lastActivityAt: now },
    });
  }

  async rotate(
    sessionIdHash: string,
    previousRefreshTokenHash: string,
    nextRefreshTokenHash: string,
    nextRefreshTokenCiphertext: string,
    now: Date,
  ): Promise<boolean> {
    const result = await this.prisma.userSession.updateMany({
      where: {
        sessionIdHash,
        refreshTokenHash: previousRefreshTokenHash,
        revokedAt: null,
        refreshStartedAt: { not: null },
      },
      data: {
        refreshTokenHash: nextRefreshTokenHash,
        refreshTokenCiphertext: nextRefreshTokenCiphertext,
        lastActivityAt: now,
        refreshStartedAt: null,
      },
    });

    return result.count === 1;
  }

  async revoke(
    sessionIdHash: string,
    reason: string,
    now: Date,
  ): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { sessionIdHash, revokedAt: null },
      data: { revokedAt: now, revocationReason: reason },
    });
  }
}
