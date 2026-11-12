import { CommunityEventStatus } from "../../domain/entities/CommunityEvent";

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

/**
 * Contrato `ActividadModificada`. Los estados viajan en el vocabulario de actividad
 * (PROGRAMADA, SUSPENDIDA, CANCELADA), no con los valores internos del evento comunitario.
 */
export function buildActivityModifiedPayload(input: {
  activityId: string;
  previousStatus: CommunityEventStatus;
  newStatus: CommunityEventStatus;
  reason: string | null;
  cause: ActivityCause;
  modifiedAt: Date;
  actorSub?: string | null;
}): Record<string, unknown> {
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
