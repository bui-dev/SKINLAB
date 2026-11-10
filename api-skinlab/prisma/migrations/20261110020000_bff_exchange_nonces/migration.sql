CREATE TABLE "bff_exchange_nonces" (
    "id" TEXT NOT NULL,
    "nonceHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bff_exchange_nonces_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bff_exchange_nonces_nonceHash_key" ON "bff_exchange_nonces"("nonceHash");
CREATE INDEX "bff_exchange_nonces_expiresAt_idx" ON "bff_exchange_nonces"("expiresAt");
