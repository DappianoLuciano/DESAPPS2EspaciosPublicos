import { randomUUID } from "crypto";
import { CommunityEvent } from "../../domain/entities/CommunityEvent";
import { DomainEvent } from "../../domain/entities/DomainEvent";
import { PublicSpace } from "../../domain/entities/PublicSpace";
import { eventNames } from "../../shared/events/eventTypes";
import { ValidationError } from "../../shared/errors/ValidationError";
import { hasCoordinates } from "../../shared/geo/distance";

export interface ActivityCreatedPayload extends Record<string, unknown> {
  actividadId: string;
  titulo: string;
  estado: string | null;
  capacidad: number | null;
  fechaHoraInicio: number;
  fechaHoraFinalizacion: number;
  ubicacion: {
    lat: number;
    lng: number;
  };
  direccion: string | null;
  espacioNombre: string | null;
}

export function buildActivityCreatedEvent(
  communityEvent: CommunityEvent,
  publicSpace: PublicSpace
): DomainEvent<ActivityCreatedPayload> {
  if (!hasCoordinates(publicSpace)) {
    throw new ValidationError(
      "El espacio publico debe tener coordenadas para publicar ActividadCreada."
    );
  }

  return {
    id: randomUUID(),
    name: eventNames.activityCreated(),
    payload: {
      actividadId: communityEvent.id,
      titulo: communityEvent.title,
      estado: communityEvent.status,
      capacidad: communityEvent.capacity,
      fechaHoraInicio: communityEvent.startDate.getTime(),
      fechaHoraFinalizacion: communityEvent.endDate.getTime(),
      ubicacion: {
        lat: publicSpace.latitude,
        lng: publicSpace.longitude
      },
      direccion: publicSpace.address || null,
      espacioNombre: publicSpace.name || null
    },
    occurredAt: new Date(communityEvent.createdAt)
  };
}
