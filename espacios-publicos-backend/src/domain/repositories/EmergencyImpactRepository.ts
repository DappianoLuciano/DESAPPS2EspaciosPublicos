import { DomainEvent } from "../entities/DomainEvent";
import {
  CreateEmergencyImpactData,
  CreateSpaceProblemData,
  EmergencyCaseRecord,
  EmergencyImpactRecord,
  EmergencyImpactSummary,
  SpaceProblemRecord
} from "../entities/EmergencyImpact";

export interface ImpactRelease {
  id: string;
  status: "CONFIRMADA" | "REPROGRAMADA" | "A_REPROGRAMAR";
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
  createImpact(data: CreateEmergencyImpactData, event: DomainEvent): Promise<boolean>;
  findUnreleased(emergenciaId: string): Promise<EmergencyImpactRecord[]>;
  releaseImpacts(releases: ImpactRelease[], releasedAt: Date, event: DomainEvent): Promise<void>;
  findImpactById(id: string): Promise<EmergencyImpactRecord | null>;
  rescheduleBooking(change: BookingReschedule, event: DomainEvent): Promise<EmergencyImpactRecord>;
  /** false si la emergencia ya tenia su problematica (RNI-04). */
  createProblem(data: CreateSpaceProblemData, event: DomainEvent): Promise<boolean>;
  findProblemById(id: string): Promise<SpaceProblemRecord | null>;
  deriveProblem(id: string, derivedTo: string, derivedBy: string, derivedAt: Date): Promise<SpaceProblemRecord>;
  listImpacts(): Promise<EmergencyImpactRecord[]>;
  listProblems(): Promise<SpaceProblemRecord[]>;
  getSummary(): Promise<EmergencyImpactSummary>;
}
