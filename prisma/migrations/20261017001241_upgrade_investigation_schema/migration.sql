-- AlterTable
ALTER TABLE "person_events" ADD COLUMN     "confidence" TEXT,
ADD COLUMN     "involvementType" TEXT NOT NULL DEFAULT 'SUSPECT',
ADD COLUMN     "verificationStatus" TEXT NOT NULL DEFAULT 'HYPOTHESIS';

-- CreateTable
CREATE TABLE "journal_entry_events" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "journal_entry_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "journal_entry_events_eventId_idx" ON "journal_entry_events"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entry_events_journalEntryId_eventId_key" ON "journal_entry_events"("journalEntryId", "eventId");

-- AddForeignKey
ALTER TABLE "journal_entry_events" ADD CONSTRAINT "journal_entry_events_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_events" ADD CONSTRAINT "journal_entry_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
