CREATE TABLE "gateway_assertion_nonces" (
    "id" TEXT NOT NULL,
    "nonceHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gateway_assertion_nonces_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "gateway_assertion_nonces_nonceHash_key" ON "gateway_assertion_nonces"("nonceHash");
CREATE INDEX "gateway_assertion_nonces_expiresAt_idx" ON "gateway_assertion_nonces"("expiresAt");
