-- CU-INT-01: incidentes de la ciudad para dibujar el plan de llegada de un evento.
CREATE TABLE "city_incidents" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "category" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "city_incidents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "city_incidents_source_externalId_key" ON "city_incidents"("source", "externalId");
CREATE INDEX "city_incidents_active_idx" ON "city_incidents"("active");
