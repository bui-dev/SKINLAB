import type { AccessContextKind, Role } from "@skinlab/contracts";

import type { UserSession } from "../domain/user-session";
import {
  createOpaqueId,
  encryptSecret,
  hashOpaqueValue,
} from "../infrastructure/identity-crypto";
import { SessionRepository } from "../infrastructure/prisma-session-repository";
import { IdentityAccountRepository } from "../infrastructure/identity-account-repository";
import { getSessionPolicy } from "../domain/session-policy";

export type CreateOidcSessionInput = {
  subject: string;
  role: Role;
  acr: string;
  deviceFingerprint: string;
  accessContext: AccessContextKind;
  refreshToken: string;
  expiresAt: Date;
  now: Date;
};

export class CreateSessionFromOidc {
  constructor(
    private readonly repository: SessionRepository,
    private readonly accounts: IdentityAccountRepository,
    private readonly encryptionKey: string,
  ) {}

  async execute(input: CreateOidcSessionInput): Promise<UserSession> {
    if (input.acr !== "2" || input.expiresAt <= input.now) {
      throw new Error("The OIDC session input is invalid.");
    }

    const account = await this.accounts.provision(input.subject, input.role);
    if (!account.isEnabled || account.role !== input.role)
      throw new Error("The identity account is unavailable.");
    const policy = getSessionPolicy(input.role, input.accessContext);
    const absoluteExpiresAt = new Date(
      input.now.getTime() + policy.absoluteMilliseconds,
    );
    const opaqueSessionId = createOpaqueId();
    const record = await this.repository.create({
      sessionIdHash: hashOpaqueValue(opaqueSessionId),
      subject: input.subject,
      role: input.role,
      acr: input.acr,
      deviceFingerprint: input.deviceFingerprint,
      accessContext: input.accessContext,
      refreshTokenHash: hashOpaqueValue(input.refreshToken),
      refreshTokenCiphertext: encryptSecret(
        input.refreshToken,
        this.encryptionKey,
      ),
      expiresAt: absoluteExpiresAt,
      absoluteExpiresAt,
      lastActivityAt: input.now,
      refreshStartedAt: null,
    });

    return {
      id: opaqueSessionId,
      subject: record.subject,
      role: input.role,
      acr: record.acr,
      deviceFingerprint: record.deviceFingerprint,
      accessContext: input.accessContext,
      expiresAt: record.expiresAt,
    };
  }
}
