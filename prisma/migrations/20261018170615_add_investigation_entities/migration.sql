-- AlterTable
ALTER TABLE "events" ADD COLUMN     "caseCode" TEXT,
ADD COLUMN     "caseStatus" TEXT DEFAULT 'UNRESOLVED',
ADD COLUMN     "crimeType" TEXT,
ADD COLUMN     "damageAssessment" TEXT,
ADD COLUMN     "incidentTimeNotes" TEXT;

-- AlterTable
ALTER TABLE "people" ADD COLUMN     "bloodType" TEXT,
ADD COLUMN     "citizenId" TEXT,
ADD COLUMN     "citizenIdIssueDate" TIMESTAMP(3),
ADD COLUMN     "citizenIdIssuePlace" TEXT,
ADD COLUMN     "heightCm" INTEGER,
ADD COLUMN     "managementLevel" TEXT DEFAULT 'NORMAL',
ADD COLUMN     "modusOperandi" TEXT,
ADD COLUMN     "residenceStatus" TEXT,
ADD COLUMN     "riskNotes" TEXT,
ADD COLUMN     "threatLevel" TEXT DEFAULT 'LOW',
ADD COLUMN     "weightKg" INTEGER;

-- AlterTable
ALTER TABLE "person_events" ADD COLUMN     "alibi" TEXT,
ADD COLUMN     "reasonForSuspicion" TEXT;

-- CreateTable
CREATE TABLE "suspect_vehicles" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "brandModel" TEXT,
    "color" TEXT,
    "identifyingFeatures" TEXT,
    "registeredOwner" TEXT,
    "isSuspicious" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "suspect_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "physical_marks" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "physical_marks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "criminal_records" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "charge" TEXT NOT NULL,
    "recordType" TEXT NOT NULL DEFAULT 'CONVICTION',
    "sentenceDetail" TEXT,
    "adjudicatedBy" TEXT,
    "incidentDate" TIMESTAMP(3),
    "verdictDate" TIMESTAMP(3),
    "isPardoned" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "criminal_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gangs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "turf" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "gangs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gang_memberships" (
    "id" TEXT NOT NULL,
    "gangId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "notes" TEXT,
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gang_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suspect_vehicles_personId_idx" ON "suspect_vehicles"("personId");

-- CreateIndex
CREATE INDEX "suspect_vehicles_plateNumber_idx" ON "suspect_vehicles"("plateNumber");

-- CreateIndex
CREATE INDEX "suspect_vehicles_personId_deletedAt_idx" ON "suspect_vehicles"("personId", "deletedAt");

-- CreateIndex
CREATE INDEX "physical_marks_personId_idx" ON "physical_marks"("personId");

-- CreateIndex
CREATE INDEX "physical_marks_type_idx" ON "physical_marks"("type");

-- CreateIndex
CREATE INDEX "physical_marks_personId_deletedAt_idx" ON "physical_marks"("personId", "deletedAt");

-- CreateIndex
CREATE INDEX "criminal_records_personId_idx" ON "criminal_records"("personId");

-- CreateIndex
CREATE INDEX "criminal_records_recordType_idx" ON "criminal_records"("recordType");

-- CreateIndex
CREATE INDEX "criminal_records_personId_deletedAt_idx" ON "criminal_records"("personId", "deletedAt");

-- CreateIndex
CREATE INDEX "gangs_userId_idx" ON "gangs"("userId");

-- CreateIndex
CREATE INDEX "gangs_userId_deletedAt_idx" ON "gangs"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "gang_memberships_gangId_idx" ON "gang_memberships"("gangId");

-- CreateIndex
CREATE INDEX "gang_memberships_personId_idx" ON "gang_memberships"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "gang_memberships_gangId_personId_key" ON "gang_memberships"("gangId", "personId");

-- CreateIndex
CREATE INDEX "events_caseCode_idx" ON "events"("caseCode");

-- CreateIndex
CREATE INDEX "events_caseStatus_idx" ON "events"("caseStatus");

-- CreateIndex
CREATE INDEX "events_crimeType_idx" ON "events"("crimeType");

-- CreateIndex
CREATE INDEX "people_citizenId_idx" ON "people"("citizenId");

-- CreateIndex
CREATE INDEX "people_managementLevel_idx" ON "people"("managementLevel");

-- CreateIndex
CREATE INDEX "people_threatLevel_idx" ON "people"("threatLevel");

-- AddForeignKey
ALTER TABLE "suspect_vehicles" ADD CONSTRAINT "suspect_vehicles_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_marks" ADD CONSTRAINT "physical_marks_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "criminal_records" ADD CONSTRAINT "criminal_records_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gangs" ADD CONSTRAINT "gangs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gang_memberships" ADD CONSTRAINT "gang_memberships_gangId_fkey" FOREIGN KEY ("gangId") REFERENCES "gangs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gang_memberships" ADD CONSTRAINT "gang_memberships_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
