import { randomUUID } from "crypto";
import { weatherLocations } from "../../domain/catalogs/weatherLocations";
import { WeatherCriticality, WeatherPhenomenon } from "../../domain/entities/WeatherAlert";
import { WeatherAlertRepository } from "../../domain/repositories/WeatherAlertRepository";
import { ValidationError } from "../../shared/errors/ValidationError";
import { normalizeStringList, requireText } from "../../shared/validation/inputValidation";

const phenomena: WeatherPhenomenon[] = ["TORMENTA_FUERTE", "LLUVIA_INTENSA", "VIENTO_FUERTE",
  "OLA_DE_CALOR", "OLA_DE_FRIO", "GRANIZO", "TORMENTA_ELECTRICA", "HURACAN", "NIEVE"];
const levels: WeatherCriticality[] = ["BAJA", "MEDIA", "ALTA", "CRITICA"];

export class CreateManualWeatherAlertUseCase {
  constructor(private readonly repository: WeatherAlertRepository) {}

  async execute(input: {
    phenomenon: unknown; criticality: unknown; locationIds: unknown;
    validFrom: unknown; validUntil: unknown; reason: unknown; source: unknown; actorSub: unknown;
    windGustKmh?: unknown; precipitationMm?: unknown; temperatureMinC?: unknown; temperatureMaxC?: unknown;
  }) {
    const actorSub = requireText(input.actorSub, "El administrador", 160);
    const reason = requireText(input.reason, "El motivo", 1000);
    const source = requireText(input.source, "La fuente de respaldo", 1000);
    const maxWindGustKmh = optionalMeasurement(input.windGustKmh, "La rafaga", 0);
    const accumulatedPrecipitationMm = optionalMeasurement(input.precipitationMm, "La precipitacion", 0);
    const temperatureMinC = optionalMeasurement(input.temperatureMinC, "La temperatura minima", -273.15);
    const temperatureMaxC = optionalMeasurement(input.temperatureMaxC, "La temperatura maxima", -273.15);
    if (temperatureMinC !== undefined && temperatureMaxC !== undefined && temperatureMinC > temperatureMaxC) {
      throw new ValidationError("La temperatura minima no puede superar la maxima.");
    }
    if (!phenomena.includes(input.phenomenon as WeatherPhenomenon) ||
      !levels.includes(input.criticality as WeatherCriticality)) {
      throw new ValidationError("El fenomeno o la criticidad no son validos.");
    }
    const ids = normalizeStringList(input.locationIds, "Las ubicaciones", weatherLocations.length, 100);
    if (!ids.length) throw new ValidationError("Selecciona al menos una ubicacion.");
    const locations = ids.map((id) => {
      const location = weatherLocations.find((item) => item.id === id);
      if (!location) throw new ValidationError("Una ubicacion no pertenece al catalogo.");
      return location;
    });
    const validFrom = new Date(requireText(input.validFrom, "El inicio", 64));
    const validUntil = new Date(requireText(input.validUntil, "El fin previsto", 64));
    if (!Number.isFinite(validFrom.getTime()) || !Number.isFinite(validUntil.getTime()) ||
      validUntil <= validFrom || validUntil <= new Date()) {
      throw new ValidationError("El periodo debe ser valido y finalizar en el futuro.");
    }
    return this.repository.create({
      deduplicationKey: "manual:" + randomUUID(),
      zone: locations[0].locality,
      latitude: locations[0].latitude,
      longitude: locations[0].longitude,
      phenomenon: input.phenomenon as WeatherPhenomenon,
      suggestedCriticality: input.criticality as WeatherCriticality,
      validFrom, validUntil,
      evidence: {
        provider: "MANUAL",
        forecastFrom: validFrom.toISOString(),
        forecastTo: validUntil.toISOString(),
        weatherCodes: [], evaluatedHours: 0,
        ...(maxWindGustKmh === undefined ? {} : { maxWindGustKmh }),
        ...(accumulatedPrecipitationMm === undefined ? {} : { accumulatedPrecipitationMm }),
        ...(temperatureMinC === undefined ? {} : { temperatureMinC }),
        ...(temperatureMaxC === undefined ? {} : { temperatureMaxC }),
        locations: locations.map(({ latitude, longitude }) => ({ latitude, longitude })),
        manual: { createdBy: actorSub, createdAt: new Date().toISOString(), reason, source, locationIds: ids }
      }
    });
  }
}

function optionalMeasurement(value: unknown, label: string, minimum: number): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum) {
    throw new ValidationError(label + " debe ser un numero valido mayor o igual a " + minimum + ".");
  }
  return value;
}
