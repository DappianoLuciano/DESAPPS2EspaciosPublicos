-- CreateTable
CREATE TABLE "public_space_affectations" (
    "id" TEXT NOT NULL,
    "publicSpaceId" TEXT NOT NULL,
    "tipoAfectacion" TEXT NOT NULL,
    "causaTipo" TEXT,
    "causaId" TEXT,
    "correlationId" TEXT NOT NULL,
    "since" TIMESTAMP(3) NOT NULL,
    "estimatedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restoredAt" TIMESTAMP(3),

    CONSTRAINT "public_space_affectations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "public_space_affectations_restoredAt_causaId_idx" ON "public_space_affectations"("restoredAt", "causaId");

-- CreateIndex
CREATE INDEX "public_space_affectations_restoredAt_publicSpaceId_idx" ON "public_space_affectations"("restoredAt", "publicSpaceId");
