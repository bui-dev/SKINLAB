import type { AccessContextKind, Role } from "@skinlab/contracts";

import type { UserSession } from "../domain/user-session";
import { hashOpaqueValue } from "../infrastructure/identity-crypto";
import { SessionRepository } from "../infrastructure/prisma-session-repository";
import { IdentityAccountRepository } from "../infrastructure/identity-account-repository";
import {
  getSessionPolicy,
  getSessionUsableUntil,
} from "../domain/session-policy";

export class GetSession {
  constructor(
    private readonly repository: SessionRepository,
    private readonly accounts: IdentityAccountRepository,
  ) {}

  async execute(
    sessionId: string,
    now: Date,
    allowRefreshPending = false,
  ): Promise<UserSession | null> {
    const record = await this.repository.find(hashOpaqueValue(sessionId));
    const account = record ? await this.accounts.find(record.subject) : null;
    if (
      !record ||
      record.revokedAt ||
      (!allowRefreshPending && record.refreshStartedAt) ||
      !account?.isEnabled
    ) {
      return null;
    }
    const expiresAt = getSessionUsableUntil(
      record.lastActivityAt,
      record.absoluteExpiresAt,
      getSessionPolicy(
        record.role as Role,
        record.accessContext as AccessContextKind,
      ),
    );
    if (expiresAt <= now) return null;
    if (!allowRefreshPending)
      await this.repository.touch(record.sessionIdHash, now);

    return {
      id: sessionId,
      subject: record.subject,
      role: record.role as Role,
      acr: record.acr,
      deviceFingerprint: record.deviceFingerprint,
      accessContext: record.accessContext as AccessContextKind,
      expiresAt,
    };
  }
}
