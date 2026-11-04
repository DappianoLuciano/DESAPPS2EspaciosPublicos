import { randomUUID } from "crypto";
import { DomainEvent } from "../entities/DomainEvent";
import { TowIntervention } from "../entities/TowIntervention";
import { ValidationError } from "../../shared/errors/ValidationError";

export const INCIDENTE_RESUELTO_EVENT_NAME =
  "com.citypass.espacios.IncidenteResuelto";

export interface IncidenteResueltoPayload {
  reclamoId: string;
  correlationId: string;
  resultado: "RESUELTO";
  idAuto: string | null;
  solicitadoAt: number | null;
  resueltoAt: number;
}

export type IncidenteResueltoEvent = DomainEvent<IncidenteResueltoPayload>;

type EventIdFactory = () => string;

export function createIncidenteResueltoEvent(
  intervention: TowIntervention,
  eventIdFactory: EventIdFactory = randomUUID
): IncidenteResueltoEvent {
  if (intervention.status !== "COMPLETED" || !intervention.resueltoAt) {
    throw new ValidationError(
      "La intervencion debe estar completada antes de preparar el evento de resolucion."
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
    name: INCIDENTE_RESUELTO_EVENT_NAME,
    payload: {
      reclamoId: intervention.reclamoId,
      correlationId: intervention.correlationId,
      resultado: "RESUELTO",
      idAuto: intervention.patente,
      solicitadoAt: intervention.solicitadoAt?.getTime() ?? null,
      resueltoAt: intervention.resueltoAt.getTime()
    },
    occurredAt: new Date(intervention.resueltoAt)
  };
}
