-- CU-INT-01: estacion de devolucion recomendada por Movilidad para cada evento.
CREATE TABLE "destination_recommendations" (
    "eventoId" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "estacionId" TEXT,
    "estacion" TEXT,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "lugaresLibres" INTEGER,
    "distanciaMetros" INTEGER,
    "mensaje" TEXT NOT NULL,
    "descartadasPorIncidentes" INTEGER NOT NULL DEFAULT 0,
    "calculadaEn" TIMESTAMP(3) NOT NULL,
    "correlationId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "destination_recommendations_pkey" PRIMARY KEY ("eventoId")
);
