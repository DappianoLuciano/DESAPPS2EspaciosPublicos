-- CreateEnum
CREATE TYPE "TowInterventionStatus" AS ENUM ('PENDING', 'TOW_REQUESTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "tow_interventions" (
    "id" TEXT NOT NULL,
    "reclamoId" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "direccion" TEXT NOT NULL,
    "barrio" TEXT NOT NULL,
    "afectaCiclovia" BOOLEAN NOT NULL,
    "estacionesAfectadasIds" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    "impactoCirculacion" TEXT NOT NULL,
    "desvioSugerido" TEXT NOT NULL,
    "requiereIntervencionInmediata" BOOLEAN NOT NULL,
    "requiereGrua" BOOLEAN NOT NULL,
    "patente" TEXT,
    "status" "TowInterventionStatus" NOT NULL DEFAULT 'PENDING',
    "evaluadoAt" TIMESTAMP(3) NOT NULL,
    "solicitadoAt" TIMESTAMP(3),
    "resueltoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tow_interventions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tow_interventions_reclamoId_key" ON "tow_interventions"("reclamoId");

-- CreateIndex
CREATE INDEX "tow_interventions_status_updatedAt_idx" ON "tow_interventions"("status", "updatedAt");
