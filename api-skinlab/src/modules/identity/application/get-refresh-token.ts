import {
  decryptSecret,
  hashOpaqueValue,
} from "../infrastructure/identity-crypto";
import { SessionRepository } from "../infrastructure/prisma-session-repository";
import { IdentityAccountRepository } from "../infrastructure/identity-account-repository";
import {
  getSessionPolicy,
  getSessionUsableUntil,
} from "../domain/session-policy";
import type { AccessContextKind, Role } from "@skinlab/contracts";

export class GetRefreshToken {
  constructor(
    private readonly repository: SessionRepository,
    private readonly accounts: IdentityAccountRepository,
    private readonly encryptionKey: string,
  ) {}

  async execute(sessionId: string, now: Date): Promise<string> {
    const session = await this.repository.find(hashOpaqueValue(sessionId));
    const account = session ? await this.accounts.find(session.subject) : null;
    if (
      !session ||
      session.revokedAt ||
      session.refreshStartedAt ||
      !account?.isEnabled ||
      getSessionUsableUntil(
        session.lastActivityAt,
        session.absoluteExpiresAt,
        getSessionPolicy(
          session.role as Role,
          session.accessContext as AccessContextKind,
        ),
      ) <= now
    ) {
      throw new Error("The session is unavailable.");
    }
    if (!(await this.repository.beginRefresh(hashOpaqueValue(sessionId), now)))
      throw new Error("The session is unavailable.");
    return decryptSecret(session.refreshTokenCiphertext, this.encryptionKey);
  }
}
