CREATE TABLE "weather_restrictions" (
  "id" TEXT NOT NULL,
  "alertId" TEXT NOT NULL,
  "publicSpaceId" TEXT,
  "communityEventId" TEXT,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validUntil" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "appliedBy" TEXT NOT NULL,
  "releasedAt" TIMESTAMP(3),
  "releasedBy" TEXT,
  CONSTRAINT "weather_restrictions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "weather_restrictions_one_target" CHECK (("publicSpaceId" IS NOT NULL)::int + ("communityEventId" IS NOT NULL)::int = 1),
  CONSTRAINT "weather_restrictions_valid_window" CHECK ("validFrom" < "validUntil"),
  CONSTRAINT "weather_restrictions_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "weather_alerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "weather_restrictions_publicSpaceId_fkey" FOREIGN KEY ("publicSpaceId") REFERENCES "public_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "weather_restrictions_communityEventId_fkey" FOREIGN KEY ("communityEventId") REFERENCES "community_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "weather_restrictions_alertId_publicSpaceId_key" ON "weather_restrictions"("alertId", "publicSpaceId");
CREATE UNIQUE INDEX "weather_restrictions_alertId_communityEventId_key" ON "weather_restrictions"("alertId", "communityEventId");
CREATE INDEX "weather_restrictions_publicSpaceId_releasedAt_validFrom_val_idx" ON "weather_restrictions"("publicSpaceId", "releasedAt", "validFrom", "validUntil");
CREATE INDEX "weather_restrictions_communityEventId_releasedAt_idx" ON "weather_restrictions"("communityEventId", "releasedAt");
-- Solo el backend (conexión administrativa) gestiona medidas; no se exponen a anon/authenticated de PostgREST.
ALTER TABLE "weather_restrictions" ENABLE ROW LEVEL SECURITY;
