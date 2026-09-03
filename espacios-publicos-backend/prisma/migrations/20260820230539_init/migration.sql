-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommunityEventStatus" AS ENUM ('ACTIVE', 'ACTIVE_FULL', 'CANCELLED');

-- CreateTable
CREATE TABLE "public_spaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "publicSpaceId" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "estimatedAttendees" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "publicSpaceId" TEXT NOT NULL,
    "organizerName" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "requiresRegistration" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "CommunityEventStatus" NOT NULL DEFAULT 'ACTIVE',
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_outbox" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reservations_publicSpaceId_startDate_endDate_idx" ON "reservations"("publicSpaceId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "community_events_publicSpaceId_startDate_endDate_idx" ON "community_events"("publicSpaceId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "event_outbox_name_idx" ON "event_outbox"("name");

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_publicSpaceId_fkey" FOREIGN KEY ("publicSpaceId") REFERENCES "public_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_events" ADD CONSTRAINT "community_events_publicSpaceId_fkey" FOREIGN KEY ("publicSpaceId") REFERENCES "public_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
