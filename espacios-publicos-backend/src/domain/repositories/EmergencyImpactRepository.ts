import { DomainEvent } from "../entities/DomainEvent";
import {
  CreateEmergencyImpactData,
  CreateSpaceProblemData,
  EmergencyCaseRecord,
  EmergencyEventNotice,
  EmergencyEventWatcher,
  EmergencyImpactInitialStatus,
  EmergencyImpactRecord,
  EmergencyImpactSummary,
  SpaceProblemRecord
} from "../entities/EmergencyImpact";

export interface ImpactRelease {
  id: string;
  status: "CONFIRMADA" | "REPROGRAMADA" | "A_REPROGRAMAR" | "CANCELADA";
}

export interface BookingReschedule {
  impact: EmergencyImpactRecord;
  startDate: Date;
  endDate: Date;
  actor: string;
}

/** Las escrituras que publican un evento lo guardan en el outbox en la misma transaccion. */
export interface EmergencyImpactRepository {
  findCase(emergenciaId: string): Promise<EmergencyCaseRecord | null>;
  saveCase(emergency: EmergencyCaseRecord): Promise<void>;
  resolveCase(emergency: EmergencyCaseRecord): Promise<void>;
  /** false si esa reserva ya estaba registrada para la emergencia (RNI-04). */
  createImpact(
    data: CreateEmergencyImpactData,
    event: DomainEvent,
    status?: EmergencyImpactInitialStatus
  ): Promise<boolean>;
  findUnreleased(emergenciaId: string): Promise<EmergencyImpactRecord[]>;
  releaseImpacts(releases: ImpactRelease[], releasedAt: Date, event: DomainEvent): Promise<void>;
  findImpactById(id: string): Promise<EmergencyImpactRecord | null>;
  rescheduleBooking(change: BookingReschedule, event: DomainEvent): Promise<EmergencyImpactRecord>;
  /** Marca la afectacion como cancelada y liberada: al resolverse la emergencia ya no se toca. */
  cancelImpact(id: string, cancelledAt: Date): Promise<EmergencyImpactRecord>;
  /** false si la emergencia ya tenia su problematica (RNI-04). */
  createProblem(data: CreateSpaceProblemData, event: DomainEvent): Promise<boolean>;
  listImpacts(): Promise<EmergencyImpactRecord[]>;
  listProblems(): Promise<SpaceProblemRecord[]>;
  getSummary(): Promise<EmergencyImpactSummary>;
  /** Eventos suspendidos, en curso durante la emergencia, pendientes de reprogramar o reprogramados que no terminaron. */
  listEventNotices(now: Date): Promise<EmergencyEventNotice[]>;
  /** true si el evento comunitario esta suspendido, en curso durante la emergencia o pendiente de reprogramar. */
  isEventOnHold(eventId: string): Promise<boolean>;
  /** Idempotente por evento y mail. Si ya se le habia avisado, vuelve a quedar pendiente. */
  addWatcher(eventId: string, email: string, name: string): Promise<void>;
  isWatching(eventId: string, email: string): Promise<boolean>;
  listPendingWatchers(eventId: string): Promise<EmergencyEventWatcher[]>;
  markWatchersNotified(ids: string[], notifiedAt: Date): Promise<void>;
}
