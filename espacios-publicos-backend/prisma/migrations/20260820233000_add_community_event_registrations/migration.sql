-- CreateTable
CREATE TABLE "community_event_registrations" (
    "id" TEXT NOT NULL,
    "communityEventId" TEXT NOT NULL,
    "citizenName" TEXT NOT NULL,
    "citizenEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_event_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "community_event_registrations_communityEventId_citizenEmail_key" ON "community_event_registrations"("communityEventId", "citizenEmail");

-- CreateIndex
CREATE INDEX "community_event_registrations_communityEventId_idx" ON "community_event_registrations"("communityEventId");

-- AddForeignKey
ALTER TABLE "community_event_registrations" ADD CONSTRAINT "community_event_registrations_communityEventId_fkey" FOREIGN KEY ("communityEventId") REFERENCES "community_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
