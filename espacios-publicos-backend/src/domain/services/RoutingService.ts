export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface RoutePath {
  /** [lat, lng], listo para dibujar. */
  coordinates: Array<[number, number]>;
  distanceMeters: number;
  durationSeconds: number;
}

export type RoutingProfile = "bike" | "foot";

export interface RoutingService {
  route(profile: RoutingProfile, from: RoutePoint, to: RoutePoint): Promise<RoutePath>;
}
