-- AlterTable
ALTER TABLE "relationships" ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'CONFIRMED',
ADD COLUMN "confidence" TEXT DEFAULT 'HIGH',
ADD COLUMN "startDate" TIMESTAMP(3),
ADD COLUMN "endDate" TIMESTAMP(3),
ADD COLUMN "source" TEXT;

-- CreateIndex
CREATE INDEX "relationships_verificationStatus_idx" ON "relationships"("verificationStatus");

