import { SaveDestinationRecommendationData } from "../../domain/entities/DestinationRecommendation";
import { CityIncidentSource } from "../../domain/entities/CityIncidentRecord";
import { CityIncidentRepository } from "../../domain/repositories/CityIncidentRepository";
import { CommunityEventRepository } from "../../domain/repositories/CommunityEventRepository";
import { DestinationRecommendationRepository } from "../../domain/repositories/DestinationRecommendationRepository";
import { InboundEventRepository } from "../../domain/repositories/InboundEventRepository";
import { ValidationError } from "../../shared/errors/ValidationError";
import { logger } from "../../shared/logging/logger";
import { MovilidadObstruccionEvaluadaInput } from "../dtos/MovilidadObstruccionEvaluadaInput";
import { ProcessMobilityObstructionEvaluatedUseCase } from "./ProcessMobilityObstructionEvaluatedUseCase";

export type ReceiveGatewayEventOutcome = "processed" | "duplicate" | "ignored";

export const MOBILITY_RECOMMENDATION_EVENT_TYPE =
  "com.citypass.movilidad.RecomendacionDestinoActualizada";
export const MOBILITY_OBSTRUCTION_EVALUATED_EVENT_TYPE =
  "com.citypass.movilidad.MovilidadObstruccionEvaluada";

const EMERGENCY_CLOSING_STATES = ["RESUELTA", "CERRADA", "DESCARTADA", "CANCELADA"] as const;

interface IncidentTypeConfig {
  kind: "created" | "updated";
  source: CityIncidentSource;
  idField: string;
  /**
   * Solo para "created". Reclamos publica coordenadas y afectaCirculacion; Emergencias
   * solo publica el barrio (data.ubicacion.barrio) y se ubica por zona.
   */
  location?: "coordinates" | "zone";
  /** Estados que dan el incidente por terminado. */
  closingStates?: readonly string[];
  /** Solo para "updated": campos de data con el estado, en orden de prioridad. */
  stateFields?: readonly string[];
}

const INCIDENT_TYPES: Record<string, IncidentTypeConfig> = {
  "com.citypass.reclamos.ReclamoCreado.v3": {
    kind: "created",
    source: "RECLAMOS",
    idField: "reclamoId",
    location: "coordinates"
  },
  "com.citypass.reclamos.ReclamoActualizado": {
    kind: "updated",
    source: "RECLAMOS",
    idField: "reclamoId",
    closingStates: ["RESUELTO", "RECHAZADO", "CERRADO"],
    stateFields: ["estadoNuevo"]
  },
  "com.citypass.emergencias.EmergenciaCreada": {
    kind: "created",
    source: "EMERGENCIAS",
    idField: "emergenciaId",
    location: "zone",
    closingStates: EMERGENCY_CLOSING_STATES
  },
  "com.citypass.emergencias.EmergenciaActualizada": {
    kind: "updated",
    source: "EMERGENCIAS",
    idField: "emergenciaId",
    closingStates: EMERGENCY_CLOSING_STATES,
    // Emergencias manda data.estado; estadoNuevo queda como compatibilidad.
    stateFields: ["estado", "estadoNuevo"]
  }
};

/** FQN conocidos, para resolver un tipo que llega sin namespace (ej. "EmergenciaCreada"). */
const KNOWN_EVENT_TYPES: readonly string[] = [
  ...Object.keys(INCIDENT_TYPES),
  MOBILITY_RECOMMENDATION_EVENT_TYPE,
  MOBILITY_OBSTRUCTION_EVALUATED_EVENT_TYPE
];

// Tópicos a los que este modulo se suscribe en el gateway: son exactamente los tipos que el webhook
// sabe procesar. scripts/register-subscriptions.ts los da de alta a partir de esta lista.
export const GATEWAY_SUBSCRIPTION_TOPICS: readonly string[] = [
  MOBILITY_RECOMMENDATION_EVENT_TYPE,
  MOBILITY_OBSTRUCTION_EVALUATED_EVENT_TYPE,
  ...Object.keys(INCIDENT_TYPES)
];

export class ReceiveGatewayEventUseCase {
  constructor(
    private readonly inboundEventRepository: InboundEventRepository,
    private readonly cityIncidentRepository: CityIncidentRepository,
    private readonly destinationRecommendationRepository: DestinationRecommendationRepository,
    private readonly communityEventRepository: Pick<CommunityEventRepository, "findById">,
    private readonly processMobilityObstructionEvaluatedUseCase?: Pick<
      ProcessMobilityObstructionEvaluatedUseCase,
      "execute"
    >
  ) {}

  /** Recibe el sobre { metadata, data } que entrega el dispatcher del gateway. */
  async execute(envelope: unknown): Promise<ReceiveGatewayEventOutcome> {
    const { eventId, eventType, data } = parseEnvelope(envelope);
    const isRecommendation = eventType === MOBILITY_RECOMMENDATION_EVENT_TYPE;
    const isMobilityObstruction =
      eventType === MOBILITY_OBSTRUCTION_EVALUATED_EVENT_TYPE;
    const incidentType = INCIDENT_TYPES[eventType];

    if (!incidentType && !isRecommendation && !isMobilityObstruction) {
      return "ignored";
    }

    // Entrega at-least-once: el eventId es estable entre reintentos del dispatcher.
    if (await this.inboundEventRepository.exists(eventId)) {
      return "duplicate";
    }

    let processed: boolean;

    if (isMobilityObstruction) {
      processed = await this.processMobilityObstruction(data);
    } else if (isRecommendation) {
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

  private async processMobilityObstruction(data: Record<string, unknown>): Promise<boolean> {
    if (!this.processMobilityObstructionEvaluatedUseCase) {
      logger.error(
        "MovilidadObstruccionEvaluada no puede procesarse: falta configurar su caso de uso"
      );
      throw new Error("El procesamiento de obstrucciones de Movilidad no esta configurado.");
    }

    await this.processMobilityObstructionEvaluatedUseCase.execute(
      parseMobilityObstruction(data)
    );
    return true;
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
    return config.location === "zone"
      ? this.processZoneIncidentCreated(config, data)
      : this.processCoordinateIncidentCreated(config, data);
  }

  // Emergencias: sin coordenadas ni afectaCirculacion; se ubica por barrio. No se filtra por tipo.
  private async processZoneIncidentCreated(
    config: IncidentTypeConfig,
    data: Record<string, unknown>
  ): Promise<boolean> {
    const externalId = readId(data[config.idField]);
    const ubicacion = asRecord(data.ubicacion);
    const barrio = ubicacion && isNonEmptyString(ubicacion.barrio) ? ubicacion.barrio.trim() : null;

    if (!externalId || !barrio) {
      return false;
    }

    // Puede llegar ya cerrada (por ejemplo, un reintento tardio): no se da de alta.
    if (config.closingStates?.includes(String(data.estado))) {
      return false;
    }

    await this.cityIncidentRepository.upsertActive({
      source: config.source,
      externalId,
      category: isNonEmptyString(data.tipo) ? data.tipo : null,
      latitude: null,
      longitude: null,
      zone: barrio
    });

    return true;
  }

  private async processCoordinateIncidentCreated(
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
      longitude: longitud,
      zone: null
    });

    return true;
  }

  private async processIncidentUpdated(
    config: IncidentTypeConfig,
    data: Record<string, unknown>
  ): Promise<boolean> {
    const externalId = readId(data[config.idField]);
    const state = readState(data, config.stateFields ?? []);

    if (!externalId || !state || !config.closingStates?.includes(state)) {
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

  // El gateway informa el tipo en metadata.eventType; algunos emisores lo mandan en metadata.type.
  const rawType = metadata
    ? isNonEmptyString(metadata.eventType)
      ? metadata.eventType
      : isNonEmptyString(metadata.type)
        ? metadata.type
        : null
    : null;

  if (!metadata || !data || !isNonEmptyString(metadata.eventId) || !rawType) {
    throw new ValidationError("El evento recibido no tiene el formato esperado.");
  }

  return { eventId: metadata.eventId, eventType: resolveEventType(rawType.trim()), data };
}

/**
 * Un tipo sin namespace ("EmergenciaCreada") se resuelve al FQN conocido que termina en
 * ".EmergenciaCreada". Si no hay ninguno, queda tal cual y el evento se ignora.
 */
function resolveEventType(type: string): string {
  if (type.includes(".")) {
    return type;
  }

  return KNOWN_EVENT_TYPES.find((fqn) => fqn.endsWith(`.${type}`)) ?? type;
}

/** Primer campo de estado con texto, en el orden configurado (ej. estado y luego estadoNuevo). */
function readState(data: Record<string, unknown>, fields: readonly string[]): string | null {
  for (const field of fields) {
    const value = data[field];

    if (isNonEmptyString(value)) {
      return value.trim();
    }
  }

  return null;
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

function parseMobilityObstruction(
  data: Record<string, unknown>
): MovilidadObstruccionEvaluadaInput {
  return {
    reclamoId: requiredString(data.reclamoId, "reclamoId"),
    correlationId: requiredString(data.correlationId, "correlationId"),
    latitud: requiredCoordinate(data.latitud, "latitud", 90),
    longitud: requiredCoordinate(data.longitud, "longitud", 180),
    direccion: requiredString(data.direccion, "direccion"),
    barrio: requiredString(data.barrio, "barrio"),
    afectaCiclovia: requiredBoolean(data.afectaCiclovia, "afectaCiclovia"),
    estacionesAfectadasIds: requiredStationIds(data.estacionesAfectadasIds),
    impactoCirculacion: requiredString(
      data.impactoCirculacion,
      "impactoCirculacion"
    ),
    desvioSugerido: requiredString(data.desvioSugerido, "desvioSugerido"),
    requiereIntervencionInmediata: requiredBoolean(
      data.requiereIntervencionInmediata,
      "requiereIntervencionInmediata"
    ),
    requiereGrua: requiredBoolean(data.requiereGrua, "requiereGrua"),
    evaluadoAt: requiredTimestamp(data.evaluadoAt, "evaluadoAt")
  };
}

function requiredString(value: unknown, field: string): string {
  if (!isNonEmptyString(value)) {
    throw new ValidationError(`El campo ${field} debe contener texto.`);
  }

  return value.trim();
}

function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new ValidationError(`El campo ${field} debe ser booleano.`);
  }

  return value;
}

function requiredCoordinate(value: unknown, field: string, limit: number): number {
  if (!isCoordinate(value, limit)) {
    throw new ValidationError(`El campo ${field} no es una coordenada valida.`);
  }

  return value;
}

function requiredStationIds(value: unknown): number[] {
  if (
    !Array.isArray(value) ||
    value.some((id) => !Number.isSafeInteger(id) || Number(id) < 0)
  ) {
    throw new ValidationError("El campo estacionesAfectadasIds no es valido.");
  }

  return [...value] as number[];
}

function requiredTimestamp(value: unknown, field: string): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    Number.isNaN(new Date(value).getTime())
  ) {
    throw new ValidationError(`El campo ${field} no es una fecha valida.`);
  }

  return value;
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
