import { RoutePoint } from "./RoutingService";

export interface NearestBikeStation {
  stationId: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Distancia en linea recta desde el punto consultado. */
  distanceMeters: number;
  availableBikes: number | null;
}

/** Todavia no hay ninguna estacion conocida (Movilidad no publico su disponibilidad). */
export class NoBikeStationsKnownError extends Error {
  constructor() {
    super("Todavia no hay estaciones de bicis cargadas.");
    this.name = "NoBikeStationsKnownError";
  }
}

/**
 * Estacion de bicis de la ciudad mas cercana a un punto, o null si no hay ninguna en el radio de busqueda.
 * Lanza NoBikeStationsKnownError si no se conoce ninguna estacion.
 */
export interface BikeStationFinder {
  findNearest(point: RoutePoint): Promise<NearestBikeStation | null>;
}
