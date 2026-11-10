import type { AccessContextKind, Role } from "@skinlab/contracts";

import type { UserSession } from "../domain/user-session";
import {
  encryptSecret,
  hashOpaqueValue,
} from "../infrastructure/identity-crypto";
import { SessionRepository } from "../infrastructure/prisma-session-repository";

export class RefreshSession {
  constructor(
    private readonly repository: SessionRepository,
    private readonly encryptionKey: string,
  ) {}

  async execute(
    sessionId: string,
    previousRefreshToken: string,
    nextRefreshToken: string,
    now: Date,
  ): Promise<UserSession> {
    const sessionIdHash = hashOpaqueValue(sessionId);
    const record = await this.repository.find(sessionIdHash);
    if (
      !record ||
      record.revokedAt ||
      record.absoluteExpiresAt <= now ||
      !record.refreshStartedAt
    ) {
      throw new Error("The session is unavailable.");
    }
    if (record.refreshTokenHash !== hashOpaqueValue(previousRefreshToken)) {
      throw new Error("The refresh token was reused.");
    }

    const rotated = await this.repository.rotate(
      sessionIdHash,
      record.refreshTokenHash,
      hashOpaqueValue(nextRefreshToken),
      encryptSecret(nextRefreshToken, this.encryptionKey),
      now,
    );
    if (!rotated) {
      throw new Error("The refresh token was reused.");
    }

    return {
      id: sessionId,
      subject: record.subject,
      role: record.role as Role,
      acr: record.acr,
      deviceFingerprint: record.deviceFingerprint,
      accessContext: record.accessContext as AccessContextKind,
      expiresAt: record.expiresAt,
    };
  }
}
