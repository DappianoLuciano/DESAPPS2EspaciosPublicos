import { WeatherAlert } from "../entities/WeatherAlert";
import { resolveWeatherNeighborhoods } from "./resolveWeatherNeighborhoods";

export type ImpactSpace = { id: string; name: string; zone?: string; status: string; exposure?: string; latitude?: number | null; longitude?: number | null };
export type ImpactEvent = { id: string; title: string; publicSpaceId: string; status: string; startDate: Date; endDate: Date; weatherRestrictions?: { alertId: string; releasedAt: Date | null }[] };
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();

export function weatherImpactCandidates(alert: WeatherAlert, spaces: ImpactSpace[], events: ImpactEvent[], now = new Date()) {
  // Puntos de referencia, no un radio arbitrario ni todos los espacios de CABA.
  const neighborhoods = resolveWeatherNeighborhoods(alert.evidence.locations || [{ latitude: alert.latitude, longitude: alert.longitude }]);
  const names = new Set(neighborhoods.map(normalize));
  const affected = spaces.filter(space => {
    if (space.status !== "ENABLED" || space.exposure === "INDOOR") return false;
    const located = typeof space.latitude === "number" && typeof space.longitude === "number";
    const zones = located
      ? resolveWeatherNeighborhoods([{ latitude: space.latitude!, longitude: space.longitude! }])
      : [space.zone || ""];
    return zones.some(zone => names.has(normalize(zone)));
  });
  const spaceIds = new Set(affected.map(space => space.id));
  const affectedEvents = events.filter(event => spaceIds.has(event.publicSpaceId) && event.status !== "CANCELLED" &&
    event.endDate > now && event.startDate < alert.validUntil && event.endDate > alert.validFrom);
  return { neighborhoods, spaces: affected, events: affectedEvents };
}
