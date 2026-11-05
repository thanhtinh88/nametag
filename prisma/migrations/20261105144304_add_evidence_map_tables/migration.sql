-- CreateTable
CREATE TABLE "event_map_markers" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "personId" TEXT,
    "markerType" TEXT NOT NULL DEFAULT 'CAMERA',
    "label" TEXT NOT NULL,
    "description" TEXT,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "occurredAt" TIMESTAMP(3),
    "color" TEXT,
    "mediaUrl" TEXT,
    "mediaType" TEXT DEFAULT 'IMAGE',
    "cameraDirection" INTEGER,
    "cameraFovDeg" INTEGER DEFAULT 60,
    "cameraStatus" TEXT DEFAULT 'CAPTURED',
    "rawTimeNote" TEXT,
    "btsCode" TEXT,
    "btsCarrier" TEXT,
    "btsRadiusMeters" INTEGER DEFAULT 300,
    "btsAzimuthDeg" INTEGER,
    "subscriberInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_map_markers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_map_routes" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "personId" TEXT,
    "label" TEXT NOT NULL,
    "routeType" TEXT NOT NULL DEFAULT 'CONFIRMED_PATH',
    "color" TEXT NOT NULL DEFAULT '#ef4444',
    "waypoints" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_map_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_map_drawings" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "drawingType" TEXT NOT NULL DEFAULT 'POLYGON',
    "label" TEXT,
    "notes" TEXT,
    "strokeColor" TEXT NOT NULL DEFAULT '#f59e0b',
    "strokeWidth" INTEGER NOT NULL DEFAULT 3,
    "strokeStyle" TEXT NOT NULL DEFAULT 'SOLID',
    "fillColor" TEXT DEFAULT '#f59e0b',
    "fillOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "coordinates" JSONB NOT NULL,
    "radiusMeters" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_map_drawings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_map_markers_eventId_idx" ON "event_map_markers"("eventId");

-- CreateIndex
CREATE INDEX "event_map_markers_eventId_markerType_idx" ON "event_map_markers"("eventId", "markerType");

-- CreateIndex
CREATE INDEX "event_map_markers_eventId_occurredAt_idx" ON "event_map_markers"("eventId", "occurredAt");

-- CreateIndex
CREATE INDEX "event_map_markers_personId_idx" ON "event_map_markers"("personId");

-- CreateIndex
CREATE INDEX "event_map_routes_eventId_idx" ON "event_map_routes"("eventId");

-- CreateIndex
CREATE INDEX "event_map_routes_personId_idx" ON "event_map_routes"("personId");

-- CreateIndex
CREATE INDEX "event_map_drawings_eventId_idx" ON "event_map_drawings"("eventId");

-- CreateIndex
CREATE INDEX "event_map_drawings_eventId_drawingType_idx" ON "event_map_drawings"("eventId", "drawingType");

-- AddForeignKey
ALTER TABLE "event_map_markers" ADD CONSTRAINT "event_map_markers_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_map_markers" ADD CONSTRAINT "event_map_markers_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_map_routes" ADD CONSTRAINT "event_map_routes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_map_routes" ADD CONSTRAINT "event_map_routes_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_map_drawings" ADD CONSTRAINT "event_map_drawings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
