import { WeatherPhenomenon } from "../entities/WeatherAlert";

// Mismos textos que muestra el panel (weatherPhenomenonLabels en el frontend).
// Record exhaustivo: un fenomeno nuevo no compila hasta tener su texto.
export const WEATHER_PHENOMENON_LABELS: Record<WeatherPhenomenon, string> = {
  TORMENTA_FUERTE: "Tormenta fuerte",
  LLUVIA_INTENSA: "Lluvia intensa",
  VIENTO_FUERTE: "Viento fuerte",
  OLA_DE_CALOR: "Ola de calor",
  OLA_DE_FRIO: "Ola de frío",
  GRANIZO: "Granizo",
  TORMENTA_ELECTRICA: "Tormenta eléctrica",
  HURACAN: "Huracán",
  NIEVE: "Nieve"
};

/** Texto legible para Analitica, por ejemplo "Tormenta fuerte en Palermo". Sin zona, solo el fenomeno. */
export function describeWeatherAlert(phenomenon: WeatherPhenomenon, zone?: string | null): string {
  const label = WEATHER_PHENOMENON_LABELS[phenomenon];
  const place = zone?.trim();
  return place ? `${label} en ${place}` : label;
}
