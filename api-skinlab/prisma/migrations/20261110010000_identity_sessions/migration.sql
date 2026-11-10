CREATE TABLE "oidc_login_attempts" (
    "id" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "nonceHash" TEXT NOT NULL,
    "codeVerifierCiphertext" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oidc_login_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "sessionIdHash" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "acr" TEXT NOT NULL,
    "deviceFingerprint" TEXT NOT NULL,
    "accessContext" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "refreshTokenCiphertext" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revocationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "oidc_login_attempts_stateHash_key" ON "oidc_login_attempts"("stateHash");
CREATE INDEX "oidc_login_attempts_expiresAt_idx" ON "oidc_login_attempts"("expiresAt");
CREATE UNIQUE INDEX "user_sessions_sessionIdHash_key" ON "user_sessions"("sessionIdHash");
CREATE INDEX "user_sessions_subject_idx" ON "user_sessions"("subject");
CREATE INDEX "user_sessions_expiresAt_idx" ON "user_sessions"("expiresAt");
