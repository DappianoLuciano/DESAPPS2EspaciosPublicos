import { randomUUID } from "crypto";
import { CommunityEvent } from "../../domain/entities/CommunityEvent";
import { DomainEvent } from "../../domain/entities/DomainEvent";
import { PublicSpace } from "../../domain/entities/PublicSpace";
import { eventNames } from "../../shared/events/eventTypes";
import { CommunityEventRegistrationRepository } from "../../domain/repositories/CommunityEventRegistrationRepository";
import { CommunityEventRepository } from "../../domain/repositories/CommunityEventRepository";
import { EventOutboxRepository } from "../../domain/repositories/EventOutboxRepository";
import { PublicSpaceRepository } from "../../domain/repositories/PublicSpaceRepository";
import { EventBus } from "../../domain/services/EventBus";

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

/**
 * Republica el estado vigente de uno o mas eventos (snapshot). Se usa cuando cambia el estado
 * fuera del flujo de inscripciones: suspension y reanudacion, manual o por medidas climaticas.
 * Movilidad lo pidio para detectar suspensiones y reanudaciones.
 */
export class CommunityEventSnapshotPublisher {
  constructor(
    private readonly communityEventRepository: Pick<CommunityEventRepository, "findById">,
    private readonly publicSpaceRepository: Pick<PublicSpaceRepository, "findById">,
    private readonly registrationRepository: Pick<CommunityEventRegistrationRepository, "countByEventId">,
    private readonly eventOutboxRepository: EventOutboxRepository,
    private readonly eventBus: EventBus
  ) {}

  async publish(communityEventIds: string[]): Promise<void> {
    for (const communityEventId of [...new Set(communityEventIds)]) {
      const communityEvent = await this.communityEventRepository.findById(communityEventId);

      // Un evento cancelado ya salio como EventoCancelado: no se vuelve a publicar.
      if (!communityEvent || communityEvent.status === "CANCELLED") {
        continue;
      }

      const space = await this.publicSpaceRepository.findById(communityEvent.publicSpaceId);
      const inscriptos = await this.registrationRepository.countByEventId(communityEvent.id);
      const event = buildCommunityEventPublishedEvent(communityEvent, space, inscriptos);

      await this.eventOutboxRepository.save(event);
      await this.eventBus.publish(event);
    }
  }
}
