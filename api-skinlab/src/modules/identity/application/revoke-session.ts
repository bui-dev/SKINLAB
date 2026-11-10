import { hashOpaqueValue } from "../infrastructure/identity-crypto";
import { SessionRepository } from "../infrastructure/prisma-session-repository";

export class RevokeSession {
  constructor(private readonly repository: SessionRepository) {}

  revokeSession(sessionId: string, reason: string, now: Date): Promise<void> {
    return this.repository.revoke(hashOpaqueValue(sessionId), reason, now);
  }

  execute(sessionId: string, reason: string, now: Date): Promise<void> {
    return this.revokeSession(sessionId, reason, now);
  }
}
