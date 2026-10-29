import { ValidationError } from "../errors/ValidationError";

/**
 * Valida un par latitud/longitud opcional.
 *
 * - undefined en ambos: no se toca (util en updates parciales).
 * - null en ambos: se borran las coordenadas.
 * - Solo uno de los dos: error, un punto a medias no sirve para nada.
 */
export function optionalCoordinates(
  latitude: unknown,
  longitude: unknown
): { latitude?: number | null; longitude?: number | null } {
  if (latitude === undefined && longitude === undefined) {
    return {};
  }

  if (latitude === null && longitude === null) {
    return { latitude: null, longitude: null };
  }

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    throw new ValidationError("La latitud y la longitud se informan juntas y deben ser numeros.");
  }

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new ValidationError("La latitud debe estar entre -90 y 90.");
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new ValidationError("La longitud debe estar entre -180 y 180.");
  }

  return { latitude, longitude };
}
