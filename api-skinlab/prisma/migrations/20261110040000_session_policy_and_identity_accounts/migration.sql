ALTER TABLE "user_sessions"
  ADD COLUMN "absoluteExpiresAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "refreshStartedAt" TIMESTAMP(3);

UPDATE "user_sessions" SET
  "absoluteExpiresAt" = "expiresAt",
  "lastActivityAt" = "createdAt";

ALTER TABLE "user_sessions"
  ALTER COLUMN "absoluteExpiresAt" DROP DEFAULT,
  ALTER COLUMN "lastActivityAt" DROP DEFAULT;

CREATE INDEX "user_sessions_absoluteExpiresAt_idx" ON "user_sessions"("absoluteExpiresAt");

CREATE TABLE "identity_accounts" (
  "subject" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "identity_accounts_pkey" PRIMARY KEY ("subject")
);
