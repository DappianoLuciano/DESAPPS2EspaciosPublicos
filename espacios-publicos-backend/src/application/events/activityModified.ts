import { randomUUID } from "crypto";
import { CommunityEventStatus } from "../../domain/entities/CommunityEvent";
import { DomainEvent } from "../../domain/entities/DomainEvent";
import { EventOutboxRepository } from "../../domain/repositories/EventOutboxRepository";
import { EventBus } from "../../domain/services/EventBus";
import { eventNames } from "../../shared/events/eventTypes";

// Al ser un Record exhaustivo, un estado nuevo no compila hasta que se decida como viaja.
export const ACTIVITY_STATES: Record<CommunityEventStatus, string> = {
  ACTIVE: "PROGRAMADA",
  ACTIVE_FULL: "PROGRAMADA",
  SUSPENDED: "SUSPENDIDA",
  CANCELLED: "CANCELADA"
};

export interface ActivityCause {
  causaTipo: string | null;
  causaId: string | null;
}

export interface ActivityModification {
  activityId: string;
  previousStatus: CommunityEventStatus;
  newStatus: CommunityEventStatus;
  reason: string | null;
  cause: ActivityCause;
  modifiedAt: Date;
  actorSub?: string | null;
}

export const NO_CAUSE: ActivityCause = { causaTipo: null, causaId: null };

export function weatherAlertCause(alertId: string): ActivityCause {
  return { causaTipo: "EVENTO_CLIMATICO", causaId: alertId };
}

/** Cada cambio de estado es un DomainEvent nuevo (id propio) con el instante del cambio. */
export function buildActivityModifiedEvent(input: ActivityModification): DomainEvent {
  return {
    id: randomUUID(),
    name: eventNames.activityModified(),
    payload: buildActivityModifiedPayload(input),
    occurredAt: input.modifiedAt
  };
}

/**
 * Publica ActividadModificada fuera de una transaccion: guarda en el outbox y publica en el bus,
 * igual que la cancelacion. Dentro de una transaccion de Prisma, usar buildActivityModifiedEvent,
 * guardar la fila con el cliente de la transaccion y publicar en el bus despues del commit.
 */
export class ActivityModifiedPublisher {
  constructor(
    private readonly eventOutboxRepository: EventOutboxRepository,
    private readonly eventBus: EventBus
  ) {}

  async publish(input: ActivityModification): Promise<void> {
    const event = buildActivityModifiedEvent(input);
    await this.eventOutboxRepository.save(event);
    await this.eventBus.publish(event);
  }
}

/**
 * Contrato `ActividadModificada`. Los estados viajan en el vocabulario de actividad
 * (PROGRAMADA, SUSPENDIDA, CANCELADA), no con los valores internos del evento comunitario.
 */
export function buildActivityModifiedPayload(input: ActivityModification): Record<string, unknown> {
  return {
    correlationId: `act-${input.activityId}`,
    actividadId: input.activityId,
    estadoAnterior: ACTIVITY_STATES[input.previousStatus],
    estadoNuevo: ACTIVITY_STATES[input.newStatus],
    motivo: input.reason,
    causaId: input.cause.causaId,
    causaTipo: input.cause.causaTipo,
    modificadaEn: input.modifiedAt.getTime(),
    actorSub: input.actorSub ?? null
  };
}
