import { randomUUID } from "crypto";
import { DomainEvent } from "../entities/DomainEvent";
import { TowIntervention } from "../entities/TowIntervention";
import { ValidationError } from "../../shared/errors/ValidationError";
import { eventNames } from "../../shared/events/eventTypes";

export type InterventionResult = "RESUELTO" | "RECHAZADO";

export interface IntervencionFinalizadaPayload extends Record<string, unknown> {
  reclamoId: string;
  resultado: InterventionResult;
  idAuto: string | null;
  solicitadoAt: number | null;
  resueltoAt: number | null;
}

export type IntervencionFinalizadaEvent =
  DomainEvent<IntervencionFinalizadaPayload>;

type EventIdFactory = () => string;

export function createIntervencionFinalizadaEvent(
  intervention: TowIntervention,
  eventIdFactory: EventIdFactory = randomUUID
): IntervencionFinalizadaEvent {
  if (intervention.status !== "COMPLETED" || !intervention.resueltoAt) {
    throw new ValidationError(
      "La intervencion debe estar completada antes de publicar su finalizacion."
    );
  }

  if (
    intervention.requiereGrua &&
    (!intervention.patente || !intervention.solicitadoAt)
  ) {
    throw new ValidationError(
      "Una intervencion con grua debe incluir patente y fecha de solicitud."
    );
  }

  return {
    id: eventIdFactory(),
    name: eventNames.interventionFinished(),
    payload: {
      reclamoId: intervention.reclamoId,
      resultado: "RESUELTO",
      idAuto: intervention.patente,
      solicitadoAt: intervention.solicitadoAt?.getTime() ?? null,
      resueltoAt: intervention.resueltoAt.getTime()
    },
    occurredAt: new Date(intervention.resueltoAt)
  };
}
