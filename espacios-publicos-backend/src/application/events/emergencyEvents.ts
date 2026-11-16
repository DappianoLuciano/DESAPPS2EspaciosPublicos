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

/** La primera coordenada valida: un valor cifrado (texto) no corta la busqueda. */
function firstCoordinate(values: unknown[], limit: number): number | null {
  for (const value of values) {
    const parsed = coordinate(value, limit);
    if (parsed !== null) return parsed;
  }
  return null;
}

/**
 * ubicacion {lat, lng} del CU-01, ubicacion {latitud, longitud} (como lo manda Movilidad), latitud/longitud
 * en la raiz de data y ubicacion.barrio. Emergencias cifra ubicacion.latitud y ubicacion.longitud, pero
 * manda latitud y longitud en claro en la raiz (redondeadas a 3 decimales, ~100 m): un texto cifrado no
 * es un numero, asi que se saltea y se usan las de la raiz. Sin ninguna valida queda el barrio.
 */
export function parseEmergencyLocation(data: Record<string, unknown>): EmergencyLocation {
  const ubicacion = typeof data.ubicacion === "object" && data.ubicacion !== null
    ? (data.ubicacion as Record<string, unknown>)
    : {};
  const latitude = firstCoordinate([ubicacion.lat, ubicacion.latitud, data.latitud], 90);
  const longitude = firstCoordinate([ubicacion.lng, ubicacion.longitud, data.longitud], 180);
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
    ...parseEmergencyLocation(data)
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
    ...parseEmergencyLocation(data)
  };
}
