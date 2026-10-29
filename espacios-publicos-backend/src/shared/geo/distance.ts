const EARTH_RADIUS_METERS = 6_371_000;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Distancia en metros entre dos puntos (formula de haversine).
 * A escala de ciudad el error frente a una geodesica exacta es de centimetros,
 * mucho menor que el radio con el que decidimos si un incidente esta "cerca".
 */
export function distanceInMeters(from: Coordinates, to: Coordinates): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(deltaLongitude / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

export function hasCoordinates(value: {
  latitude?: number | null;
  longitude?: number | null;
}): value is Coordinates {
  return typeof value.latitude === "number" && typeof value.longitude === "number";
}
