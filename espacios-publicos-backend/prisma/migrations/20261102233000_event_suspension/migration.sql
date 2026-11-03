-- Aditiva: no elimina eventos ni inscripciones. No ejecutar migraciones históricas sin revisión.
ALTER TYPE "CommunityEventStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';
ALTER TABLE "community_events" ADD COLUMN "statusReason" TEXT;
