-- CU-INT-01: Emergencias publica el barrio (data.ubicacion.barrio) y no coordenadas.
-- Aditiva: las filas existentes conservan sus coordenadas y quedan con zone en null.
ALTER TABLE "city_incidents" ALTER COLUMN "latitude" DROP NOT NULL;
ALTER TABLE "city_incidents" ALTER COLUMN "longitude" DROP NOT NULL;
ALTER TABLE "city_incidents" ADD COLUMN "zone" TEXT;

CREATE INDEX "city_incidents_active_zone_idx" ON "city_incidents"("active", "zone");
