import { randomUUID } from "crypto";
import { CommunityEvent } from "../../domain/entities/CommunityEvent";
import { DomainEvent } from "../../domain/entities/DomainEvent";
import { PublicSpace } from "../../domain/entities/PublicSpace";
import { eventNames } from "../../shared/events/eventTypes";

export type CommunityEventPublishedSpace = Pick<PublicSpace, "zone" | "address" | "latitude" | "longitude">;

/**
 * Contrato EventoComunitarioPublicado (schema en scripts/register-event-types.ts):
 * siempre todos los campos, con null en los opcionales. Se publica al crear el evento y
 * cada vez que cambian los inscriptos o el estado; `inscriptos` es el total actual.
 */
export function buildCommunityEventPublishedPayload(
  event: CommunityEvent,
  space: CommunityEventPublishedSpace | null,
  inscriptos: number
): Record<string, unknown> {
  return {
    eventoId: event.id,
    espacioId: event.publicSpaceId,
    titulo: event.title,
    zona: space?.zone ?? null,
    direccion: space?.address ?? null,
    latitud: space?.latitude ?? null,
    longitud: space?.longitude ?? null,
    inicio: event.startDate.toISOString(),
    fin: event.endDate.toISOString(),
    capacidad: event.capacity,
    cupoMaximo: event.capacity,
    inscriptos,
    estado: event.status,
    categoria: event.category,
    correlationId: `evento-${event.id}`
  };
}

/** Cada publicacion es un DomainEvent nuevo (id propio); el eventoId se mantiene. */
export function buildCommunityEventPublishedEvent(
  event: CommunityEvent,
  space: CommunityEventPublishedSpace | null,
  inscriptos: number
): DomainEvent {
  return {
    id: randomUUID(),
    name: eventNames.communityEventPublished(),
    payload: buildCommunityEventPublishedPayload(event, space, inscriptos),
    occurredAt: new Date()
  };
}
