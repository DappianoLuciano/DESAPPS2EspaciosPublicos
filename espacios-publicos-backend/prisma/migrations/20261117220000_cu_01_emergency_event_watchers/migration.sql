-- CU-01. Aditiva: solo crea una tabla nueva, no modifica reservas, eventos ni las tablas del CU-01.
CREATE TABLE "emergency_event_watchers" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "notifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "emergency_event_watchers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "emergency_event_watchers_eventId_email_key" ON "emergency_event_watchers"("eventId", "email");
CREATE INDEX "emergency_event_watchers_eventId_notifiedAt_idx" ON "emergency_event_watchers"("eventId", "notifiedAt");

-- Solo el backend la usa: no se expone por PostgREST.
ALTER TABLE "emergency_event_watchers" ENABLE ROW LEVEL SECURITY;
