import { BikeStationRepository } from "../../domain/repositories/BikeStationRepository";
import { BikeStationFinder, NearestBikeStation, NoBikeStationsKnownError } from "../../domain/services/BikeStationFinder";
import { RoutePoint } from "../../domain/services/RoutingService";
import { distanceInMeters } from "../../shared/geo/distance";

/** Mas lejos que esto no tiene sentido caminar para retirar una bici de la ciudad. */
export const MAX_PICKUP_DISTANCE_METERS = 5_000;

/**
 * Estacion de retiro: la mas cercana al ciudadano entre las que Movilidad publico por el bus
 * (EstacionDisponibilidadActualizada). No llama a Movilidad: lee la copia local.
 */
export class NearestBikeStationFinder implements BikeStationFinder {
  constructor(private readonly stations: Pick<BikeStationRepository, "findActive">) {}

  async findNearest(point: RoutePoint): Promise<NearestBikeStation | null> {
    const stations = await this.stations.findActive();

    if (stations.length === 0) {
      throw new NoBikeStationsKnownError();
    }

    let nearest: NearestBikeStation | null = null;

    for (const station of stations) {
      const meters = Math.round(distanceInMeters(point, station));

      if (meters <= MAX_PICKUP_DISTANCE_METERS && (!nearest || meters < nearest.distanceMeters)) {
        nearest = {
          stationId: station.id,
          name: station.name,
          latitude: station.latitude,
          longitude: station.longitude,
          distanceMeters: meters,
          availableBikes: station.availableBikes
        };
      }
    }

    return nearest;
  }
}
