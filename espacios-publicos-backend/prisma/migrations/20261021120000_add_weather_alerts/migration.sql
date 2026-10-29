-- CreateEnum
CREATE TYPE "PublicSpaceExposure" AS ENUM ('INDOOR', 'OUTDOOR', 'MIXED');

-- CreateEnum
CREATE TYPE "WeatherCriticality" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "WeatherPhenomenon" AS ENUM ('TORMENTA_FUERTE', 'LLUVIA_INTENSA', 'VIENTO_FUERTE');

-- CreateEnum
CREATE TYPE "WeatherAlertStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISMISSED', 'FINALIZED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

-- AlterTable
ALTER TABLE "public_spaces" ADD COLUMN "exposure" "PublicSpaceExposure" NOT NULL DEFAULT 'MIXED';

-- AlterTable
ALTER TABLE "event_outbox"
ADD COLUMN "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "nextAttemptAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lastError" TEXT;

-- Preserve the delivery state of rows that an earlier version already marked as published.
UPDATE "event_outbox"
SET "status" = 'PUBLISHED'
WHERE "publishedAt" IS NOT NULL;

-- CreateTable
CREATE TABLE "weather_alerts" (
    "id" TEXT NOT NULL,
    "deduplicationKey" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "phenomenon" "WeatherPhenomenon" NOT NULL,
    "suggestedCriticality" "WeatherCriticality" NOT NULL,
    "confirmedCriticality" "WeatherCriticality",
    "status" "WeatherAlertStatus" NOT NULL DEFAULT 'PENDING',
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "evidence" JSONB NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "dismissedAt" TIMESTAMP(3),
    "dismissedBy" TEXT,
    "dismissalReason" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "finalizedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weather_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weather_alerts_deduplicationKey_key" ON "weather_alerts"("deduplicationKey");

-- CreateIndex
CREATE INDEX "weather_alerts_status_validUntil_idx" ON "weather_alerts"("status", "validUntil");

-- CreateIndex
CREATE INDEX "weather_alerts_zone_status_idx" ON "weather_alerts"("zone", "status");

-- CreateIndex
CREATE INDEX "event_outbox_status_nextAttemptAt_idx" ON "event_outbox"("status", "nextAttemptAt");
