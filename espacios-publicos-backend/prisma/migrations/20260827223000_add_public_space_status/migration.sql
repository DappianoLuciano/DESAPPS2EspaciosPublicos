CREATE TYPE "PublicSpaceStatus" AS ENUM ('ENABLED', 'DISABLED');

ALTER TABLE "public_spaces"
ADD COLUMN "status" "PublicSpaceStatus" NOT NULL DEFAULT 'ENABLED';
