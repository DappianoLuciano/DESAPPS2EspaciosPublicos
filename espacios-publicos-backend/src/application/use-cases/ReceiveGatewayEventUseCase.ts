import { SaveDestinationRecommendationData } from "../../domain/entities/DestinationRecommendation";
import { CityIncidentSource } from "../../domain/entities/CityIncidentRecord";
import { CityIncidentRepository } from "../../domain/repositories/CityIncidentRepository";
import { CommunityEventRepository } from "../../domain/repositories/CommunityEventRepository";
import { DestinationRecommendationRepository } from "../../domain/repositories/DestinationRecommendationRepository";
import { InboundEventRepository } from "../../domain/repositories/InboundEventRepository";
import { PublicSpaceRepository } from "../../domain/repositories/PublicSpaceRepository";
import { distanceInMeters, hasCoordinates } from "../../shared/geo/distance";
import {
  PublicSpaceAffectationCause,
  PublicSpaceAffectationType,
  PublicSpaceAffectedPublisher,
  stableAffectationId
} from "../events/publicSpaceAffected";
import { ValidationError } from "../../shared/errors/ValidationError";
import { EmergencyReactions, parseEmergencyCreated, parseEmergencyResolved } from "../events/emergencyEvents";
import { logger } from "../../shared/logging/logger";

/** Un reclamo que corta la circulacion a esta distancia o menos deja el espacio con uso parcial. */
export const AFFECTED_SPACE_RADIUS_METERS = 1000;

export type ReceiveGatewayEventOutcome = "processed" | "duplicate" | "ignored";

export const MOBILITY_RECOMMENDATION_EVENT_TYPE =
  "com.citypass.movilidad.RecomendacionDestinoActualizada";

export const EMERGENCY_RESOLVED_EVENT_TYPE = "com.citypass.emergencias.EmergenciaResuelta";
/** Movilidad evalua una obstruccion en la via (reclamo con coordenadas): es el incidente vial. */
export const OBSTRUCTION_EVALUATED_EVENT_TYPE = "com.citypass.movilidad.MovilidadObstruccionEvaluada";
/** Reclamos publica coordenadas y afectaCirculacion recien al reclasificar (ReclamoCreado no las trae). */
export const CLAIM_RECLASSIFIED_EVENT_TYPE = "com.citypass.reclamos.ReclamoReclasificado";

// Movilidad no documenta los valores de impactoCirculacion. Mientras tanto: sin impacto se ignora,
// impacto bajo deja el espacio con uso parcial y cualquier otro valor lo restringe.
const NO_TRAFFIC_IMPACT = /^(NINGUNO|SIN_IMPACTO|NULO|NONE)$/i;
const LOW_TRAFFIC_IMPACT = /^(BAJO|LEVE|LOW|MENOR)$/i;

// El gateway usa el FQN como topico; el documento del CU-01 los nombra con puntos. Se aceptan los
// dos. Emergencias publica hoy EmergenciaEstadoActualizado y EmergenciaCerrada, sin causas ni
// ubicacion: esos cierres liberan lo afectado, pero no pueden registrar una problematica.
const EMERGENCY_CREATED_TYPES: readonly string[] = [
  "emergencia.creada",
  "com.citypass.emergencias.EmergenciaCreada"
];
const EMERGENCY_STATE_UPDATED_EVENT_TYPE = "com.citypass.emergencias.EmergenciaEstadoActualizado";
const EMERGENCY_CLOSED_EVENT_TYPE = "com.citypass.emergencias.EmergenciaCerrada";
const EMERGENCY_CANCELLED_EVENT_TYPE = "com.citypass.emergencias.EmergenciaCancelada";
// Falsa alarma (A1): se libera lo suspendido, pero no hay causas que atender.
const EMERGENCY_CANCELLED_TYPES: readonly string[] = ["emergencia.cancelada", EMERGENCY_CANCELLED_EVENT_TYPE];
const EMERGENCY_RESOLVED_TYPES: readonly string[] = [
  "emergencia.resuelta",
  EMERGENCY_RESOLVED_EVENT_TYPE,
  EMERGENCY_CLOSED_EVENT_TYPE,
  ...EMERGENCY_CANCELLED_TYPES
];
const EMERGENCY_UPDATED_TYPES: readonly string[] = [
  "emergencia.estado.actualizado",
  "com.citypass.emergencias.EmergenciaActualizada",
  EMERGENCY_STATE_UPDATED_EVENT_TYPE
];
const EMERGENCY_CANCELLED_STATES: readonly string[] = ["CANCELADA", "DESCARTADA"];
const EMERGENCY_FINISHED_STATES: readonly string[] = ["RESUELTA", "CERRADA", ...EMERGENCY_CANCELLED_STATES];
const EMERGENCY_STATE_FIELDS: readonly string[] = ["estado", "estadoNuevo", "nuevoEstado"];

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
  "com.citypass.reclamos.ReclamoCreado": {
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
  OBSTRUCTION_EVALUATED_EVENT_TYPE,
  CLAIM_RECLASSIFIED_EVENT_TYPE,
  EMERGENCY_STATE_UPDATED_EVENT_TYPE,
  EMERGENCY_CLOSED_EVENT_TYPE,
  EMERGENCY_CANCELLED_EVENT_TYPE,
  EMERGENCY_RESOLVED_EVENT_TYPE
];

// Tópicos a los que este modulo se suscribe en el gateway: son exactamente los tipos que el webhook
// sabe procesar. scripts/register-subscriptions.ts los da de alta a partir de esta lista.
export const GATEWAY_SUBSCRIPTION_TOPICS: readonly string[] = [
  MOBILITY_RECOMMENDATION_EVENT_TYPE,
  ...Object.keys(INCIDENT_TYPES),
  OBSTRUCTION_EVALUATED_EVENT_TYPE,
  CLAIM_RECLASSIFIED_EVENT_TYPE,
  EMERGENCY_STATE_UPDATED_EVENT_TYPE,
  EMERGENCY_CLOSED_EVENT_TYPE,
  // Van ultimos: si G6 todavia no los registro, el script falla despues de suscribir los demas.
  EMERGENCY_CANCELLED_EVENT_TYPE,
  EMERGENCY_RESOLVED_EVENT_TYPE
];

export class ReceiveGatewayEventUseCase {
  constructor(
    private readonly inboundEventRepository: InboundEventRepository,
    private readonly cityIncidentRepository: CityIncidentRepository,
    private readonly destinationRecommendationRepository: DestinationRecommendationRepository,
    private readonly communityEventRepository: Pick<CommunityEventRepository, "findById">,
    // Opcionales: sin ellos el incidente se registra igual, pero no se publica EspacioPublicoAfectado.
    private readonly publicSpaceRepository?: Pick<PublicSpaceRepository, "findAll">,
    private readonly affectedPublisher?: PublicSpaceAffectedPublisher,
    private readonly emergencyReactions?: EmergencyReactions
  ) {}

  /** Recibe el sobre { metadata, data } que entrega el dispatcher del gateway. */
  async execute(envelope: unknown): Promise<ReceiveGatewayEventOutcome> {
    const { eventId, eventType, data } = parseEnvelope(envelope);
    const isRecommendation = eventType === MOBILITY_RECOMMENDATION_EVENT_TYPE;
    const incidentType = INCIDENT_TYPES[eventType];
    const isObstruction = eventType === OBSTRUCTION_EVALUATED_EVENT_TYPE;
    const isReclassification = eventType === CLAIM_RECLASSIFIED_EVENT_TYPE;

    const reactsToEmergency = this.reactsToEmergency(eventType, data);

    if (!incidentType && !isRecommendation && !isObstruction && !isReclassification && !reactsToEmergency) {
      return "ignored";
    }

    // Entrega at-least-once: el eventId es estable entre reintentos del dispatcher.
    if (await this.inboundEventRepository.exists(eventId)) {
      return "duplicate";
    }

    let processed = false;

    if (isRecommendation) {
      processed = await this.processRecommendation(data);
    } else if (isObstruction) {
      processed = await this.processObstructionEvaluated(data);
    } else if (isReclassification) {
      processed = await this.processClaimReclassified(data);
    } else if (incidentType?.kind === "created") {
      processed = await this.processIncidentCreated(incidentType, data);
    } else if (incidentType) {
      processed = await this.processIncidentUpdated(incidentType, data);
    }

    // CU-01: va despues del alta o baja del incidente. Si falla, el gateway reintenta y lo anterior
    // es idempotente; el eventId recien se registra cuando las dos partes terminaron.
    if (reactsToEmergency && (await this.reactToEmergency(eventType, data))) {
      processed = true;
    }

    if (!processed) {
      return "ignored";
    }

    await this.inboundEventRepository.record(eventId, eventType);

    return "processed";
  }

  private reactsToEmergency(eventType: string, data: Record<string, unknown>): boolean {
    return (
      this.emergencyReactions !== undefined &&
      (EMERGENCY_CREATED_TYPES.includes(eventType) ||
        EMERGENCY_RESOLVED_TYPES.includes(eventType) ||
        (EMERGENCY_UPDATED_TYPES.includes(eventType) &&
          EMERGENCY_FINISHED_STATES.includes(readState(data, EMERGENCY_STATE_FIELDS) ?? "")))
    );
  }

  private async reactToEmergency(eventType: string, data: Record<string, unknown>): Promise<boolean> {
    if (EMERGENCY_CREATED_TYPES.includes(eventType)) {
      const created = parseEmergencyCreated(data);
      return created ? this.emergencyReactions!.onCreated(created) : false;
    }

    const resolved = parseEmergencyResolved(data);

    if (!resolved) {
      return false;
    }

    // EmergenciaResuelta tambien cierra el incidente del plan de llegada.
    await this.cityIncidentRepository.deactivate("EMERGENCIAS", resolved.emergenciaId);

    const cancelled =
      EMERGENCY_CANCELLED_TYPES.includes(eventType) ||
      EMERGENCY_CANCELLED_STATES.includes(readState(data, EMERGENCY_STATE_FIELDS) ?? "");

    return this.emergencyReactions!.onResolved(cancelled ? { ...resolved, causes: [] } : resolved);
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

    if (config.source === "RECLAMOS") {
      await this.publishNearbySpacesAffected(
        { latitude: latitud, longitude: longitud }, "USO_PARCIAL", "RECLAMO", externalId
      );
    }

    return true;
  }

  // Incidente vial: obstruccion evaluada por Movilidad. Queda como incidente activo del reclamo (plan de
  // llegada; se cierra con ReclamoActualizado) y restringe el acceso a los espacios cercanos (Analitica).
  private async processObstructionEvaluated(data: Record<string, unknown>): Promise<boolean> {
    const reclamoId = readId(data.reclamoId);
    const { latitud, longitud } = data;
    const impacto = isNonEmptyString(data.impactoCirculacion) ? data.impactoCirculacion.trim() : "";

    if (!reclamoId || !isCoordinate(latitud, 90) || !isCoordinate(longitud, 180) || NO_TRAFFIC_IMPACT.test(impacto)) {
      return false;
    }

    await this.cityIncidentRepository.upsertActive({
      source: "RECLAMOS",
      externalId: reclamoId,
      category: "OBSTRUCCION_VIAL",
      latitude: latitud,
      longitude: longitud,
      zone: isNonEmptyString(data.barrio) ? data.barrio.trim() : null
    });

    const tipo: PublicSpaceAffectationType =
      data.requiereIntervencionInmediata !== true && LOW_TRAFFIC_IMPACT.test(impacto) ? "USO_PARCIAL" : "ACCESO_RESTRINGIDO";
    await this.publishNearbySpacesAffected({ latitude: latitud, longitude: longitud }, tipo, "INCIDENTE_VIAL", reclamoId);

    return true;
  }

  // Un reclamo reclasificado que pasa a cortar la circulacion se da de alta como incidente; si deja de
  // cortarla, se cierra.
  private async processClaimReclassified(data: Record<string, unknown>): Promise<boolean> {
    const reclamoId = readId(data.reclamoId);
    const { latitud, longitud } = data;

    if (!reclamoId) {
      return false;
    }

    if (data.afectaCirculacionNueva !== true) {
      if (data.afectaCirculacionAnterior !== true) {
        return false;
      }
      await this.cityIncidentRepository.deactivate("RECLAMOS", reclamoId);
      return true;
    }

    if (!isCoordinate(latitud, 90) || !isCoordinate(longitud, 180)) {
      return false;
    }

    await this.cityIncidentRepository.upsertActive({
      source: "RECLAMOS",
      externalId: reclamoId,
      category: isNonEmptyString(data.categoriaNueva) ? data.categoriaNueva : null,
      latitude: latitud,
      longitude: longitud,
      zone: isNonEmptyString(data.barrio) ? data.barrio.trim() : null
    });
    await this.publishNearbySpacesAffected({ latitude: latitud, longitude: longitud }, "USO_PARCIAL", "RECLAMO", reclamoId);

    return true;
  }

  // Analitica: cada espacio habilitado a AFFECTED_SPACE_RADIUS_METERS o menos queda afectado.
  private async publishNearbySpacesAffected(
    location: { latitude: number; longitude: number },
    tipoAfectacion: PublicSpaceAffectationType,
    causaTipo: PublicSpaceAffectationCause,
    causaId: string
  ): Promise<void> {
    if (!this.publicSpaceRepository || !this.affectedPublisher) {
      return;
    }

    const spaces = await this.publicSpaceRepository.findAll({ status: "ENABLED" });
    const nearby = spaces.filter(
      (space) => hasCoordinates(space) &&
        distanceInMeters(location, { latitude: space.latitude!, longitude: space.longitude! }) <= AFFECTED_SPACE_RADIUS_METERS
    );
    const desde = new Date();

    await this.affectedPublisher.publish(nearby.map((space) => ({
      afectacionId: stableAffectationId(causaTipo, causaId, space.id),
      space,
      tipoAfectacion,
      desde,
      hastaEstimada: null,
      causaId,
      causaTipo
    })));
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

  // Sobre estilo CloudEvents del CU-01: id y type van en la raiz.
  if (body && !metadata && data && isNonEmptyString(body.specversion) && isNonEmptyString(body.id) && isNonEmptyString(body.type)) {
    return { eventId: body.id, eventType: resolveEventType(body.type.trim()), data };
  }

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
