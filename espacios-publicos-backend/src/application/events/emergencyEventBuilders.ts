import { randomUUID } from "crypto";
import { DomainEvent } from "../../domain/entities/DomainEvent";
import { EmergencyBookingType } from "../../domain/entities/EmergencyImpact";
import { eventNames } from "../../shared/events/eventTypes";

function domainEvent(name: string, payload: Record<string, unknown>, occurredAt: Date): DomainEvent {
  return { id: randomUUID(), name, payload, occurredAt };
}

export function buildReservationAffectedEvent(input: {
  emergenciaId: string;
  publicSpaceId: string;
  bookingId: string;
  bookingType: EmergencyBookingType;
  startDate: Date;
  endDate: Date;
  action: "SUSPENDIDA" | "REPROGRAMADA";
  occurredAt: Date;
}): DomainEvent {
  return domainEvent(eventNames.reservationAffected(), {
    correlationId: input.emergenciaId,
    emergenciaId: input.emergenciaId,
    espacioId: input.publicSpaceId,
    reservaId: input.bookingId,
    tipoReserva: input.bookingType === "RESERVATION" ? "ESPACIO" : "EVENTO",
    horario: { inicio: input.startDate.toISOString(), fin: input.endDate.toISOString() },
    accion: input.action,
    afectadaEn: input.occurredAt.toISOString()
  }, input.occurredAt);
}

export function buildSpaceReleasedEvent(input: {
  emergenciaId: string;
  publicSpaceId: string;
  confirmed: string[];
  rescheduled: string[];
  occurredAt: Date;
}): DomainEvent {
  return domainEvent(eventNames.spaceReleased(), {
    correlationId: input.emergenciaId,
    emergenciaId: input.emergenciaId,
    espacioId: input.publicSpaceId,
    reservasConfirmadas: input.confirmed,
    reservasReprogramadas: input.rescheduled,
    liberadoEn: input.occurredAt.toISOString()
  }, input.occurredAt);
}

export function buildProblemRegisteredEvent(input: {
  emergenciaId: string;
  problemId: string;
  publicSpaceId: string | null;
  type: string;
  latitude: number | null;
  longitude: number | null;
  occurredAt: Date;
}): DomainEvent {
  return domainEvent(eventNames.problemRegistered(), {
    correlationId: input.emergenciaId,
    emergenciaId: input.emergenciaId,
    problematicaId: input.problemId,
    espacioId: input.publicSpaceId,
    tipo: input.type,
    latitud: input.latitude,
    longitud: input.longitude,
    registradaEn: input.occurredAt.toISOString()
  }, input.occurredAt);
}
