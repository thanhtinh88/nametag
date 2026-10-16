-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'PLANNED',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "hasTime" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "photo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_groups" (
    "eventId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_groups_pkey" PRIMARY KEY ("eventId","groupId")
);

-- CreateTable
CREATE TABLE "event_addresses" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "streetLine1" TEXT,
    "streetLine2" TEXT,
    "locality" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "geocodedAt" TIMESTAMP(3),
    "geocodeStatus" TEXT,
    "geocodeHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_urls" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_urls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_custom_fields" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_custom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_events" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "role" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "person_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_relationships" (
    "id" TEXT NOT NULL,
    "fromEventId" TEXT NOT NULL,
    "toEventId" TEXT NOT NULL,
    "relationshipType" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "event_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_userId_idx" ON "events"("userId");

-- CreateIndex
CREATE INDEX "events_userId_startDate_idx" ON "events"("userId", "startDate");

-- CreateIndex
CREATE INDEX "events_userId_title_idx" ON "events"("userId", "title");

-- CreateIndex
CREATE INDEX "events_userId_deletedAt_idx" ON "events"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "event_groups_eventId_idx" ON "event_groups"("eventId");

-- CreateIndex
CREATE INDEX "event_groups_groupId_idx" ON "event_groups"("groupId");

-- CreateIndex
CREATE INDEX "event_addresses_eventId_idx" ON "event_addresses"("eventId");

-- CreateIndex
CREATE INDEX "event_addresses_geocodeStatus_idx" ON "event_addresses"("geocodeStatus");

-- CreateIndex
CREATE INDEX "event_urls_eventId_idx" ON "event_urls"("eventId");

-- CreateIndex
CREATE INDEX "event_custom_fields_eventId_idx" ON "event_custom_fields"("eventId");

-- CreateIndex
CREATE INDEX "person_events_personId_idx" ON "person_events"("personId");

-- CreateIndex
CREATE INDEX "person_events_eventId_idx" ON "person_events"("eventId");

-- CreateIndex
CREATE INDEX "person_events_personId_deletedAt_idx" ON "person_events"("personId", "deletedAt");

-- CreateIndex
CREATE INDEX "person_events_eventId_deletedAt_idx" ON "person_events"("eventId", "deletedAt");

-- CreateIndex
CREATE INDEX "event_relationships_fromEventId_idx" ON "event_relationships"("fromEventId");

-- CreateIndex
CREATE INDEX "event_relationships_toEventId_idx" ON "event_relationships"("toEventId");

-- CreateIndex
CREATE INDEX "event_relationships_fromEventId_deletedAt_idx" ON "event_relationships"("fromEventId", "deletedAt");

-- CreateIndex
CREATE INDEX "event_relationships_toEventId_deletedAt_idx" ON "event_relationships"("toEventId", "deletedAt");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_groups" ADD CONSTRAINT "event_groups_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_groups" ADD CONSTRAINT "event_groups_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_addresses" ADD CONSTRAINT "event_addresses_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_urls" ADD CONSTRAINT "event_urls_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_custom_fields" ADD CONSTRAINT "event_custom_fields_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_events" ADD CONSTRAINT "person_events_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_events" ADD CONSTRAINT "person_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_relationships" ADD CONSTRAINT "event_relationships_fromEventId_fkey" FOREIGN KEY ("fromEventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_relationships" ADD CONSTRAINT "event_relationships_toEventId_fkey" FOREIGN KEY ("toEventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
