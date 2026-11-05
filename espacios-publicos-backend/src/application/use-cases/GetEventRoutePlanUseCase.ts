import { CityIncidentRepository } from "../../domain/repositories/CityIncidentRepository";
import { CommunityEventRepository } from "../../domain/repositories/CommunityEventRepository";
import { DestinationRecommendationRepository } from "../../domain/repositories/DestinationRecommendationRepository";
import { PublicSpaceRepository } from "../../domain/repositories/PublicSpaceRepository";
import { RoutePath, RoutePoint, RoutingService } from "../../domain/services/RoutingService";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { UnprocessableEntityError } from "../../shared/errors/UnprocessableEntityError";
import { distanceInMeters, hasCoordinates } from "../../shared/geo/distance";
import { logger } from "../../shared/logging/logger";
import { requireText } from "../../shared/validation/inputValidation";

export const ROUTE_PLAN_INCIDENT_RADIUS_METERS = 1000;
export const STALE_RECOMMENDATION_MINUTES = 30;

const METERS_PER_DEGREE_LATITUDE = 111_320;
const INCIDENTS_UNAVAILABLE_WARNING = "No se pudieron consultar los incidentes cercanos.";

/** "Villa Pueyrredón " y "villa pueyrredon" son la misma zona. */
export function normalizeZone(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function pushOnce(warnings: string[], warning: string): void {
  if (!warnings.includes(warning)) {
    warnings.push(warning);
  }
}

export interface RoutePlanInput {
  eventId: string;
  from?: RoutePoint;
}

export interface RoutePlan {
  destination: {
    eventId: string;
    title: string;
    latitude: number;
    longitude: number;
    address: string;
  };
  /**
   * RADIUS: incidente con coordenadas a ROUTE_PLAN_INCIDENT_RADIUS_METERS o menos.
   * ZONE: incidente sin coordenadas (Emergencias) en el mismo barrio que el espacio;
   * no tiene ubicacion ni distancia.
   */
  incidents: Array<{
    source: string;
    category: string | null;
    latitude: number | null;
    longitude: number | null;
    distanceMeters: number | null;
    zone: string | null;
    matchedBy: "RADIUS" | "ZONE";
  }>;
  dropoff: {
    stationName: string;
    latitude: number;
    longitude: number;
    availableSlots: number | null;
    distanceMeters: number | null;
    message: string;
    discardedByIncidents: number;
    calculatedAt: string;
  } | null;
  origin: RoutePoint | null;
  bikeRoute: RoutePath | null;
  walkRoute: RoutePath | null;
  warnings: string[];
}

// Solo lee la base propia (la recomendacion de Movilidad llega por el bus) y
// pide los recorridos a OSRM, que es un servicio de mapas y no otro modulo.
export class GetEventRoutePlanUseCase {
  constructor(
    private readonly communityEventRepository: CommunityEventRepository,
    private readonly publicSpaceRepository: PublicSpaceRepository,
    private readonly cityIncidentRepository: CityIncidentRepository,
    private readonly destinationRecommendationRepository: DestinationRecommendationRepository,
    private readonly routingService: RoutingService
  ) {}

  async execute(input: RoutePlanInput): Promise<RoutePlan> {
    const eventId = requireText(input.eventId, "El evento", 128);
    const communityEvent = await this.communityEventRepository.findById(eventId);

    if (!communityEvent) {
      throw new NotFoundError("El evento comunitario indicado no existe.");
    }

    const space = await this.publicSpaceRepository.findById(communityEvent.publicSpaceId);

    if (!space) {
      throw new NotFoundError("El espacio publico del evento no existe.");
    }

    if (!hasCoordinates(space)) {
      throw new UnprocessableEntityError("El espacio del evento no tiene ubicacion cargada.");
    }

    const destination: RoutePoint = { latitude: space.latitude, longitude: space.longitude };
    const warnings: string[] = [];

    // Una recomendacion guardada deja de servir si el evento se cancelo o el espacio se deshabilito.
    const inactiveReason =
      communityEvent.status === "CANCELLED"
        ? "El evento fue cancelado."
        : communityEvent.status === "SUSPENDED"
          ? "El evento está suspendido temporalmente."
        : space.status === "DISABLED"
          ? "El espacio no esta habilitado."
          : null;

    const [incidents, dropoff] = await Promise.all([
      this.findIncidents(destination, space.zone ?? null, warnings),
      this.findDropoff(eventId, inactiveReason, warnings)
    ]);

    const origin = input.from ?? null;
    const [bikeRoute, walkRoute] = await Promise.all([
      origin && dropoff
        ? this.findRoute("bike", origin, dropoff, "en bici", warnings)
        : Promise.resolve(null),
      dropoff ? this.findRoute("foot", dropoff, destination, "a pie", warnings) : Promise.resolve(null)
    ]);

    return {
      destination: {
        eventId: communityEvent.id,
        title: communityEvent.title,
        latitude: destination.latitude,
        longitude: destination.longitude,
        address: space.address
      },
      incidents,
      dropoff,
      origin,
      bikeRoute,
      walkRoute,
      warnings
    };
  }

  private async findIncidents(
    destination: RoutePoint,
    zone: string | null,
    warnings: string[]
  ): Promise<RoutePlan["incidents"]> {
    const [byRadius, byZone] = await Promise.all([
      this.findIncidentsByRadius(destination, warnings),
      this.findIncidentsByZone(zone, warnings)
    ]);

    return [...byRadius, ...byZone];
  }

  private async findIncidentsByRadius(
    destination: RoutePoint,
    warnings: string[]
  ): Promise<RoutePlan["incidents"]> {
    const latitudeDelta = ROUTE_PLAN_INCIDENT_RADIUS_METERS / METERS_PER_DEGREE_LATITUDE;
    const longitudeDelta =
      latitudeDelta / Math.max(Math.cos((destination.latitude * Math.PI) / 180), 0.01);

    try {
      const candidates = await this.cityIncidentRepository.findActiveInBounds({
        minLatitude: destination.latitude - latitudeDelta,
        maxLatitude: destination.latitude + latitudeDelta,
        minLongitude: destination.longitude - longitudeDelta,
        maxLongitude: destination.longitude + longitudeDelta
      });

      return candidates
        .flatMap((incident) => {
          if (incident.latitude === null || incident.longitude === null) {
            return [];
          }

          const location = { latitude: incident.latitude, longitude: incident.longitude };
          const distanceMeters = Math.round(distanceInMeters(destination, location));

          return distanceMeters <= ROUTE_PLAN_INCIDENT_RADIUS_METERS
            ? [
                {
                  source: incident.source,
                  category: incident.category,
                  ...location,
                  distanceMeters,
                  zone: incident.zone ?? null,
                  matchedBy: "RADIUS" as const
                }
              ]
            : [];
        })
        .sort((a, b) => a.distanceMeters - b.distanceMeters);
    } catch (error) {
      logger.error({ err: error }, "No se pudieron leer los incidentes activos");
      pushOnce(warnings, INCIDENTS_UNAVAILABLE_WARNING);
      return [];
    }
  }

  // Emergencias solo informa el barrio: se cruzan por zona, sin tildes ni mayusculas.
  private async findIncidentsByZone(
    zone: string | null,
    warnings: string[]
  ): Promise<RoutePlan["incidents"]> {
    const spaceZone = normalizeZone(zone);

    if (!spaceZone) {
      return [];
    }

    try {
      const candidates = await this.cityIncidentRepository.findActiveWithoutCoordinatesWithZone();

      return candidates
        .filter((incident) => normalizeZone(incident.zone) === spaceZone)
        .map((incident) => ({
          source: incident.source,
          category: incident.category,
          latitude: null,
          longitude: null,
          distanceMeters: null,
          zone: incident.zone,
          matchedBy: "ZONE" as const
        }));
    } catch (error) {
      logger.error({ err: error }, "No se pudieron leer los incidentes activos por zona");
      pushOnce(warnings, INCIDENTS_UNAVAILABLE_WARNING);
      return [];
    }
  }

  // La estacion la calcula Movilidad y la dejamos guardada al recibir su evento.
  private async findDropoff(
    eventId: string,
    inactiveReason: string | null,
    warnings: string[]
  ): Promise<RoutePlan["dropoff"]> {
    if (inactiveReason) {
      warnings.push(inactiveReason);
      return null;
    }

    let recommendation;

    try {
      recommendation = await this.destinationRecommendationRepository.findByEventId(eventId);
    } catch (error) {
      logger.error({ err: error }, "No se pudo leer la recomendacion de Movilidad");
      warnings.push("No se pudo consultar la estacion recomendada.");
      return null;
    }

    if (!recommendation) {
      warnings.push("Movilidad todavía no calculó la estación");
      return null;
    }

    if (recommendation.estado === "NO_RECOMMENDATION") {
      warnings.push(recommendation.mensaje || "Movilidad no tiene una estación para recomendar.");
      return null;
    }

    const { estacion: stationName, latitud: latitude, longitud: longitude } = recommendation;

    if (!stationName || latitude === null || longitude === null) {
      warnings.push(recommendation.mensaje || "Movilidad no informó la ubicación de la estación.");
      return null;
    }

    const ageMinutes = Math.floor((Date.now() - recommendation.calculadaEn.getTime()) / 60_000);

    if (ageMinutes > STALE_RECOMMENDATION_MINUTES) {
      warnings.push(`La disponibilidad puede haber cambiado (calculada hace ${ageMinutes} min)`);
    }

    return {
      stationName,
      latitude,
      longitude,
      availableSlots: recommendation.lugaresLibres,
      distanceMeters: recommendation.distanciaMetros,
      message: recommendation.mensaje,
      discardedByIncidents: recommendation.descartadasPorIncidentes,
      calculatedAt: recommendation.calculadaEn.toISOString()
    };
  }

  private async findRoute(
    profile: "bike" | "foot",
    from: RoutePoint,
    to: RoutePoint,
    label: string,
    warnings: string[]
  ): Promise<RoutePath | null> {
    try {
      return await this.routingService.route(profile, from, to);
    } catch (error) {
      logger.warn({ err: error, profile }, "El servicio de rutas no respondio");
      warnings.push(`No pudimos calcular el recorrido ${label}; se muestra una linea recta.`);
      return null;
    }
  }
}
