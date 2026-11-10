import type { ConsumedLoginAttempt } from "../domain/oidc-login-attempt";
import { decryptSecret, hashOpaqueValue } from "../infrastructure/identity-crypto";
import { LoginAttemptRepository } from "../infrastructure/prisma-login-attempt-repository";

export class ConsumeLoginAttempt {
  constructor(
    private readonly repository: LoginAttemptRepository,
    private readonly encryptionKey: string,
  ) {}

  async execute(
    attemptId: string,
    returnedState: string,
    now: Date,
  ): Promise<ConsumedLoginAttempt> {
    const record = await this.repository.find(attemptId);
    if (!record || record.stateHash !== hashOpaqueValue(returnedState)) {
      throw new Error("The login attempt state is invalid.");
    }
    if (record.expiresAt <= now) {
      throw new Error("The login attempt has expired.");
    }
    if (!(await this.repository.markConsumed(attemptId, record.stateHash, now))) {
      throw new Error("The login attempt was already consumed.");
    }

    return {
      nonceHash: record.nonceHash,
      codeVerifier: decryptSecret(record.codeVerifierCiphertext, this.encryptionKey),
    };
  }
}
