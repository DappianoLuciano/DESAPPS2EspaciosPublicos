-- Cierre definitivo de incidentes: un alta que llega despues del cierre (desorden o reintento del bus) no lo reactiva.
-- Aditiva: columna nueva nullable.
ALTER TABLE "city_incidents" ADD COLUMN "closedAt" TIMESTAMP(3);
