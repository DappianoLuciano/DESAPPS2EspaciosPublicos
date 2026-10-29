-- CU-INT-01: ruta urbana inteligente con incidentes en tiempo real.

-- Coordenadas de los espacios publicos.
ALTER TABLE "public_spaces" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "public_spaces" ADD COLUMN "longitude" DOUBLE PRECISION;

-- Indice para el outbox. Las columnas attempts y lastError las agrega add_weather_alerts.
CREATE INDEX IF NOT EXISTS "event_outbox_publishedAt_createdAt_idx" ON "event_outbox"("publishedAt", "createdAt");

-- Idempotencia de los webhooks entrantes.
CREATE TABLE "inbound_events" (
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inbound_events_pkey" PRIMARY KEY ("eventId")
);

-- Incidentes ya avisados por evento.
CREATE TABLE "event_incident_impacts" (
    "id" TEXT NOT NULL,
    "communityEventId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "distanceMeters" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_incident_impacts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "event_incident_impacts_communityEventId_source_incidentId_key"
    ON "event_incident_impacts"("communityEventId", "source", "incidentId");
