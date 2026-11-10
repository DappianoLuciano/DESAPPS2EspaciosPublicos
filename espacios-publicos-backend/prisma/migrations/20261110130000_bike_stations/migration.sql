-- CreateTable
CREATE TABLE "bike_stations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "availableBikes" INTEGER,
    "availableSlots" INTEGER,
    "capacity" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bike_stations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bike_stations_active_idx" ON "bike_stations"("active");
