-- CreateTable
CREATE TABLE "suspect_bank_accounts" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountHolder" TEXT,
    "accountType" TEXT NOT NULL DEFAULT 'OWNER',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "suspect_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suspect_bank_accounts_personId_idx" ON "suspect_bank_accounts"("personId");

-- CreateIndex
CREATE INDEX "suspect_bank_accounts_accountNumber_idx" ON "suspect_bank_accounts"("accountNumber");

-- CreateIndex
CREATE INDEX "suspect_bank_accounts_personId_deletedAt_idx" ON "suspect_bank_accounts"("personId", "deletedAt");

-- AddForeignKey
ALTER TABLE "suspect_bank_accounts" ADD CONSTRAINT "suspect_bank_accounts_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
