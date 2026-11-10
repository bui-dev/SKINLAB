export type OidcLoginAttempt = {
  id: string;
  stateHash: string;
  nonceHash: string;
  codeVerifierCiphertext: string;
  expiresAt: Date;
  consumedAt: Date | null;
};

export type ConsumedLoginAttempt = {
  nonceHash: string;
  codeVerifier: string;
};
