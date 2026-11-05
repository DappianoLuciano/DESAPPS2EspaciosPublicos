import { weatherImpactCandidates } from "../../src/domain/services/weatherImpact";
import { WeatherAlert } from "../../src/domain/entities/WeatherAlert";

const now = new Date("2030-11-02T12:00:00Z");
const alert = { latitude: -34.611, longitude: -58.383, validFrom: new Date("2030-11-03T15:00:00Z"),
  validUntil: new Date("2030-11-03T20:00:00Z"), evidence: {} } as WeatherAlert;
const space = { id: "s1", name: "Plaza", status: "ENABLED", exposure: "OUTDOOR", latitude: -34.611, longitude: -58.383, zone: "MONSERRAT" };
const event = { id: "e1", title: "Feria", status: "ACTIVE", publicSpaceId: "s1",
  startDate: new Date("2030-11-03T19:00:00Z"), endDate: new Date("2030-11-03T21:00:00Z") };

describe("Alcance propuesto para una decisión manual", () => {
  it("selecciona espacios exteriores del mismo barrio y eventos superpuestos parcialmente", () => {
    const result = weatherImpactCandidates(alert, [space], [event], now);
    expect(result.neighborhoods).toContain("MONSERRAT");
    expect(result.spaces.map(space => space.id)).toEqual(["s1"]);
    expect(result.events.map(event => event.id)).toEqual(["e1"]);
  });
  it("excluye interiores, deshabilitados y barrios distintos aunque zone diga CABA", () => {
    const result = weatherImpactCandidates(alert, [
      { ...space, id: "indoor", exposure: "INDOOR" }, { ...space, id: "disabled", status: "DISABLED" },
      { ...space, id: "palermo", latitude: -34.578, longitude: -58.425, zone: "CABA" }
    ], [event], now);
    expect(result.spaces).toEqual([]);
    expect(result.events).toEqual([]);
  });
  it("los límites no se superponen: fin igual al inicio o inicio igual al fin", () => {
    const result = weatherImpactCandidates(alert, [space], [
      { ...event, endDate: alert.validFrom, startDate: new Date("2030-11-03T14:00:00Z") },
      { ...event, startDate: alert.validUntil, endDate: new Date("2030-11-03T21:00:00Z") },
      { ...event, status: "CANCELLED" }
    ], now);
    expect(result.events).toEqual([]);
  });
  it("no usa un radio arbitrario ni considera toda CABA si el punto no tiene barrio", () => {
    expect(weatherImpactCandidates({ ...alert, latitude: 0, longitude: 0 }, [space], [event], now).spaces).toEqual([]);
  });
  it("usa barrio exacto como respaldo si faltan coordenadas, pero no contradice coordenadas conocidas", () => {
    const result = weatherImpactCandidates(alert, [
      { ...space, latitude: null, longitude: null, zone: "monserrat" },
      { ...space, id: "other", latitude: -34.578, longitude: -58.425, zone: "MONSERRAT" }
    ], [event], now);
    expect(result.spaces.map(space => space.id)).toEqual(["s1"]);
  });
});
