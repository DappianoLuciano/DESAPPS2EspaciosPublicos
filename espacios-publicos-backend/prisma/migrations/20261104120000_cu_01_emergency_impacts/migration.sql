-- CU-01. Aditiva: solo crea tablas nuevas, no modifica reservas ni eventos.
CREATE TABLE "emergency_cases" (
  "emergenciaId" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "zone" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "emergency_cases_pkey" PRIMARY KEY ("emergenciaId")
);

CREATE TABLE "emergency_booking_impacts" (
  "id" TEXT NOT NULL,
  "emergenciaId" TEXT NOT NULL,
  "bookingType" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "publicSpaceId" TEXT NOT NULL,
  "bookingLabel" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL,
  "organizerName" TEXT NOT NULL,
  "organizerEmail" TEXT,
  "rescheduledBy" TEXT,
  "rescheduledAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "emergency_booking_impacts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "emergency_booking_impacts_emergenciaId_bookingType_bookingId_key" ON "emergency_booking_impacts"("emergenciaId", "bookingType", "bookingId");
CREATE INDEX "emergency_booking_impacts_emergenciaId_releasedAt_idx" ON "emergency_booking_impacts"("emergenciaId", "releasedAt");
CREATE INDEX "emergency_booking_impacts_status_idx" ON "emergency_booking_impacts"("status");

CREATE TABLE "public_space_problems" (
  "id" TEXT NOT NULL,
  "emergenciaId" TEXT NOT NULL,
  "publicSpaceId" TEXT,
  "type" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "public_space_problems_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "public_space_problems_emergenciaId_key" ON "public_space_problems"("emergenciaId");

-- Solo el backend las usa: no se exponen por PostgREST.
ALTER TABLE "emergency_cases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "emergency_booking_impacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public_space_problems" ENABLE ROW LEVEL SECURITY;
