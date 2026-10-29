import {
  RoutePath,
  RoutePoint,
  RoutingProfile,
  RoutingService
} from "../../domain/services/RoutingService";

const REQUEST_TIMEOUT_MS = 4_000;

// Servidores publicos y de demo de OpenStreetMap; para produccion habria que apuntar a un OSRM propio.
export const DEFAULT_ROUTING_BIKE_URL = "https://routing.openstreetmap.de/routed-bike";
export const DEFAULT_ROUTING_FOOT_URL = "https://routing.openstreetmap.de/routed-foot";

type FetchFn = typeof fetch;

interface OsrmResponse {
  code?: string;
  routes?: Array<{
    distance?: unknown;
    duration?: unknown;
    geometry?: { coordinates?: unknown };
  }>;
}

export class OsrmRoutingService implements RoutingService {
  constructor(
    private readonly baseUrls: Record<RoutingProfile, string>,
    private readonly fetchFn: FetchFn = (input, init) => fetch(input, init)
  ) {}

  async route(profile: RoutingProfile, from: RoutePoint, to: RoutePoint): Promise<RoutePath> {
    const baseUrl = this.baseUrls[profile].replace(/\/+$/, "");
    // OSRM espera lng,lat. El perfil lo define el servidor: el path siempre dice "driving".
    const waypoints = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
    const url = `${baseUrl}/route/v1/driving/${waypoints}?overview=full&geometries=geojson`;

    const response = await this.fetchFn(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });

    if (!response.ok) {
      throw new Error(`El servicio de rutas respondio ${response.status}.`);
    }

    const body = (await response.json()) as OsrmResponse;
    const route = body.routes?.[0];
    const rawCoordinates = route?.geometry?.coordinates;

    if (
      body.code !== "Ok" ||
      !route ||
      !Array.isArray(rawCoordinates) ||
      typeof route.distance !== "number" ||
      typeof route.duration !== "number"
    ) {
      throw new Error("El servicio de rutas no devolvio un recorrido.");
    }

    return {
      // GeoJSON viene como [lng, lat]; el front dibuja con [lat, lng].
      coordinates: rawCoordinates.map(([longitude, latitude]: [number, number]) => [latitude, longitude]),
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration)
    };
  }
}
