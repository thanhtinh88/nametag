-- AlterTable
ALTER TABLE "people" ADD COLUMN "immichPersonId" TEXT;
ALTER TABLE "people" ADD COLUMN "immichAlbumId" TEXT;

-- AlterTable
ALTER TABLE "events" ADD COLUMN "immichAlbumId" TEXT;

-- CreateTable
CREATE TABLE "immich_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serverUrl" TEXT NOT NULL,
    "publicUrl" TEXT,
    "apiKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastError" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "immich_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "immich_connections_userId_key" ON "immich_connections"("userId");

-- AddForeignKey
ALTER TABLE "immich_connections" ADD CONSTRAINT "immich_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
