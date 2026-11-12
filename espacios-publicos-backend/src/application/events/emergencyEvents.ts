import { EmergencyLocation } from "../../domain/entities/EmergencyImpact";

export interface EmergencyCreated extends EmergencyLocation {
  emergenciaId: string;
  occurredAt: Date;
}

export interface EmergencyResolved extends EmergencyLocation {
  emergenciaId: string;
  causes: string[];
  problemType: string | null;
}

export interface EmergencyReactions {
  onCreated(emergency: EmergencyCreated): Promise<boolean>;
  onResolved(emergency: EmergencyResolved): Promise<boolean>;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function emergencyId(value: unknown): string | null {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : text(value);
}

function coordinate(value: unknown, limit: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
}

/**
 * ubicacion {lat, lng} del CU-01, ubicacion {latitud, longitud} (como lo manda Movilidad), latitud/longitud
 * sueltos y ubicacion.barrio. Emergencias hoy cifra latitud y longitud: un texto cifrado no es un numero,
 * asi que se ignora y queda el barrio.
 */
function parseLocation(data: Record<string, unknown>): EmergencyLocation {
  const ubicacion = typeof data.ubicacion === "object" && data.ubicacion !== null
    ? (data.ubicacion as Record<string, unknown>)
    : {};
  const latitude = coordinate(ubicacion.lat ?? ubicacion.latitud ?? data.latitud, 90);
  const longitude = coordinate(ubicacion.lng ?? ubicacion.longitud ?? data.longitud, 180);
  const hasBoth = latitude !== null && longitude !== null;

  return {
    latitude: hasBoth ? latitude : null,
    longitude: hasBoth ? longitude : null,
    zone: text(ubicacion.barrio)
  };
}

export function parseEmergencyCreated(data: Record<string, unknown>): EmergencyCreated | null {
  const emergenciaId = emergencyId(data.emergenciaId);

  if (!emergenciaId) {
    return null;
  }

  const reportedAt = text(data.createdAt) ? new Date(data.createdAt as string) : new Date();

  return {
    emergenciaId,
    occurredAt: Number.isNaN(reportedAt.getTime()) ? new Date() : reportedAt,
    ...parseLocation(data)
  };
}

export function parseEmergencyResolved(data: Record<string, unknown>): EmergencyResolved | null {
  const emergenciaId = emergencyId(data.emergenciaId);

  if (!emergenciaId) {
    return null;
  }

  return {
    emergenciaId,
    causes: Array.isArray(data.causasRelacionadas)
      ? data.causasRelacionadas.filter((cause): cause is string => typeof cause === "string")
      : [],
    problemType: text(data.tipoProblematica),
    ...parseLocation(data)
  };
}
