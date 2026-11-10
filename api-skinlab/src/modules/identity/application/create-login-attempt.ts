import { encryptSecret, hashOpaqueValue } from "../infrastructure/identity-crypto";
import { LoginAttemptRepository } from "../infrastructure/prisma-login-attempt-repository";

export type CreateLoginAttemptInput = {
  state: string;
  nonce: string;
  codeVerifier: string;
  expiresAt: Date;
};

export class CreateLoginAttempt {
  constructor(
    private readonly repository: LoginAttemptRepository,
    private readonly encryptionKey: string,
  ) {}

  async execute(input: CreateLoginAttemptInput): Promise<{ attemptId: string }> {
    const record = await this.repository.create({
      stateHash: hashOpaqueValue(input.state),
      nonceHash: hashOpaqueValue(input.nonce),
      codeVerifierCiphertext: encryptSecret(input.codeVerifier, this.encryptionKey),
      expiresAt: input.expiresAt,
    });

    return { attemptId: record.id };
  }
}
