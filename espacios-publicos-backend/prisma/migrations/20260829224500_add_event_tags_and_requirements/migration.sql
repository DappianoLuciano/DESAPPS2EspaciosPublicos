-- AlterTable
ALTER TABLE "community_events"
ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "requirements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
