import { SaveDestinationRecommendationData } from "../../domain/entities/DestinationRecommendation";
import { CityIncidentSource } from "../../domain/entities/CityIncidentRecord";
import { CityIncidentRepository } from "../../domain/repositories/CityIncidentRepository";
import { CommunityEventRepository } from "../../domain/repositories/CommunityEventRepository";
import { DestinationRecommendationRepository } from "../../domain/repositories/DestinationRecommendationRepository";
import { InboundEventRepository } from "../../domain/repositories/InboundEventRepository";
import { ValidationError } from "../../shared/errors/ValidationError";
import { logger } from "../../shared/logging/logger";

export type ReceiveGatewayEventOutcome = "processed" | "duplicate" | "ignored";

export const MOBILITY_RECOMMENDATION_EVENT_TYPE =
  "com.citypass.movilidad.RecomendacionDestinoActualizada";

interface IncidentTypeConfig {
  kind: "created" | "updated";
  source: CityIncidentSource;
  idField: string;
  /** Solo para "updated": estados (estadoNuevo) que dan el incidente por terminado. */
  closingStates?: readonly string[];
}

const INCIDENT_TYPES: Record<string, IncidentTypeConfig> = {
  "com.citypass.reclamos.ReclamoCreado": {
    kind: "created",
    source: "RECLAMOS",
    idField: "reclamoId"
  },
  "com.citypass.reclamos.ReclamoActualizado": {
    kind: "updated",
    source: "RECLAMOS",
    idField: "reclamoId",
    closingStates: ["RESUELTO", "RECHAZADO", "CERRADO"]
  },
  "com.citypass.emergencias.EmergenciaCreada": {
    kind: "created",
    source: "EMERGENCIAS",
    idField: "emergenciaId"
  },
  "com.citypass.emergencias.EmergenciaActualizada": {
    kind: "updated",
    source: "EMERGENCIAS",
    idField: "emergenciaId",
    closingStates: ["RESUELTA", "CERRADA", "DESCARTADA", "CANCELADA"]
  }
};

// Tópicos a los que este modulo se suscribe en el gateway: son exactamente los tipos que el webhook
// sabe procesar. scripts/register-subscriptions.ts los da de alta a partir de esta lista.
export const GATEWAY_SUBSCRIPTION_TOPICS: readonly string[] = [
  MOBILITY_RECOMMENDATION_EVENT_TYPE,
  ...Object.keys(INCIDENT_TYPES)
];

export class ReceiveGatewayEventUseCase {
  constructor(
    private readonly inboundEventRepository: InboundEventRepository,
    private readonly cityIncidentRepository: CityIncidentRepository,
    private readonly destinationRecommendationRepository: DestinationRecommendationRepository,
    private readonly communityEventRepository: Pick<CommunityEventRepository, "findById">
  ) {}

  /** Recibe el sobre { metadata, data } que entrega el dispatcher del gateway. */
  async execute(envelope: unknown): Promise<ReceiveGatewayEventOutcome> {
    const { eventId, eventType, data } = parseEnvelope(envelope);
    const isRecommendation = eventType === MOBILITY_RECOMMENDATION_EVENT_TYPE;
    const incidentType = INCIDENT_TYPES[eventType];

    if (!incidentType && !isRecommendation) {
      return "ignored";
    }

    // Entrega at-least-once: el eventId es estable entre reintentos del dispatcher.
    if (await this.inboundEventRepository.exists(eventId)) {
      return "duplicate";
    }

    let processed: boolean;

    if (isRecommendation) {
      processed = await this.processRecommendation(data);
    } else if (incidentType.kind === "created") {
      processed = await this.processIncidentCreated(incidentType, data);
    } else {
      processed = await this.processIncidentUpdated(incidentType, data);
    }

    if (!processed) {
      return "ignored";
    }

    await this.inboundEventRepository.record(eventId, eventType);

    return "processed";
  }

  // Movilidad publica la estacion de devolucion recomendada para un evento nuestro.
  private async processRecommendation(data: Record<string, unknown>): Promise<boolean> {
    const recommendation = parseRecommendation(data);

    if (!recommendation) {
      logger.warn("Recomendacion de Movilidad ignorada: el payload no tiene el formato esperado");
      return false;
    }

    if (!(await this.communityEventRepository.findById(recommendation.eventoId))) {
      logger.warn(
        { eventoId: recommendation.eventoId },
        "Recomendacion de Movilidad ignorada: el evento no existe"
      );
      return false;
    }

    const saved = await this.destinationRecommendationRepository.saveIfNewer(recommendation);

    if (!saved) {
      logger.info(
        { eventoId: recommendation.eventoId },
        "Recomendacion de Movilidad descartada: ya hay una mas reciente"
      );
    }

    return saved;
  }

  private async processIncidentCreated(
    config: IncidentTypeConfig,
    data: Record<string, unknown>
  ): Promise<boolean> {
    const externalId = readId(data[config.idField]);
    const { latitud, longitud } = data;

    // Solo interesan los incidentes que cortan la circulacion y tienen ubicacion.
    if (
      data.afectaCirculacion !== true ||
      !externalId ||
      !isCoordinate(latitud, 90) ||
      !isCoordinate(longitud, 180)
    ) {
      return false;
    }

    // El upsert es idempotente si el dispatcher reintenta.
    await this.cityIncidentRepository.upsertActive({
      source: config.source,
      externalId,
      category: isNonEmptyString(data.categoria) ? data.categoria : null,
      latitude: latitud,
      longitude: longitud
    });

    return true;
  }

  private async processIncidentUpdated(
    config: IncidentTypeConfig,
    data: Record<string, unknown>
  ): Promise<boolean> {
    const externalId = readId(data[config.idField]);

    if (!externalId || !config.closingStates?.includes(String(data.estadoNuevo))) {
      return false;
    }

    await this.cityIncidentRepository.deactivate(config.source, externalId);

    return true;
  }
}

function parseEnvelope(envelope: unknown): {
  eventId: string;
  eventType: string;
  data: Record<string, unknown>;
} {
  const body = asRecord(envelope);
  const metadata = body ? asRecord(body.metadata) : null;
  const data = body ? asRecord(body.data) : null;

  if (!metadata || !data || !isNonEmptyString(metadata.eventId) || !isNonEmptyString(metadata.eventType)) {
    throw new ValidationError("El evento recibido no tiene el formato esperado.");
  }

  return { eventId: metadata.eventId, eventType: metadata.eventType, data };
}

function parseRecommendation(data: Record<string, unknown>): SaveDestinationRecommendationData | null {
  const calculatedAt = typeof data.calculadaEn === "string" ? new Date(data.calculadaEn) : null;

  if (
    !isNonEmptyString(data.eventoId) ||
    (data.estado !== "RECOMMENDED" && data.estado !== "NO_RECOMMENDATION") ||
    !calculatedAt ||
    Number.isNaN(calculatedAt.getTime())
  ) {
    return null;
  }

  return {
    eventoId: data.eventoId,
    estado: data.estado,
    // estacionId es un long en el contrato: llega como numero y se guarda como string.
    estacionId: readId(data.estacionId),
    estacion: isNonEmptyString(data.estacion) ? data.estacion : null,
    latitud: isCoordinate(data.latitud, 90) ? data.latitud : null,
    longitud: isCoordinate(data.longitud, 180) ? data.longitud : null,
    lugaresLibres: readInteger(data.lugaresLibres),
    distanciaMetros: readInteger(data.distanciaMetros),
    mensaje: typeof data.mensaje === "string" ? data.mensaje : "",
    descartadasPorIncidentes: readInteger(data.descartadasPorIncidentes) ?? 0,
    calculadaEn: calculatedAt,
    correlationId: isNonEmptyString(data.correlationId) ? data.correlationId : null
  };
}

function readInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

function readId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return isNonEmptyString(value) ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isCoordinate(value: unknown, limit: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;
}
