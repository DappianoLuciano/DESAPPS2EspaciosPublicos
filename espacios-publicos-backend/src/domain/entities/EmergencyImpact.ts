export type EmergencyBookingType = "RESERVATION" | "COMMUNITY_EVENT";
export type EmergencyImpactStatus = "SUSPENDIDA" | "CONFIRMADA" | "REPROGRAMADA" | "A_REPROGRAMAR";
export type SpaceProblemStatus = "REGISTRADA" | "DERIVADA";

export interface EmergencyLocation {
  latitude: number | null;
  longitude: number | null;
  zone: string | null;
}

export interface EmergencyCaseRecord extends EmergencyLocation {
  emergenciaId: string;
  occurredAt: Date;
  resolvedAt: Date | null;
}

export interface EmergencyImpactRecord {
  id: string;
  emergenciaId: string;
  bookingType: EmergencyBookingType;
  bookingId: string;
  publicSpaceId: string;
  startDate: Date;
  endDate: Date;
  status: EmergencyImpactStatus;
  organizerName: string;
  organizerEmail: string | null;
  rescheduledBy: string | null;
  rescheduledAt: Date | null;
  releasedAt: Date | null;
  createdAt: Date;
}

export type CreateEmergencyImpactData = Pick<
  EmergencyImpactRecord,
  | "emergenciaId"
  | "bookingType"
  | "bookingId"
  | "publicSpaceId"
  | "startDate"
  | "endDate"
  | "organizerName"
  | "organizerEmail"
>;

export interface SpaceProblemRecord {
  id: string;
  emergenciaId: string;
  publicSpaceId: string | null;
  type: string;
  latitude: number | null;
  longitude: number | null;
  status: SpaceProblemStatus;
  derivedTo: string | null;
  derivedBy: string | null;
  derivedAt: Date | null;
  createdAt: Date;
}

export type CreateSpaceProblemData = Pick<
  SpaceProblemRecord,
  "id" | "emergenciaId" | "publicSpaceId" | "type" | "latitude" | "longitude"
>;

export interface EmergencyImpactSummary {
  reservations: number;
  affectedBookings: number;
  releasedSpaces: number;
  problems: number;
}
