import { CreateManualWeatherAlertUseCase } from "../../src/application/use-cases/CreateManualWeatherAlertUseCase";
import { weatherLocations } from "../../src/domain/catalogs/weatherLocations";
import { WeatherAlertRepository } from "../../src/domain/repositories/WeatherAlertRepository";

describe("CreateManualWeatherAlertUseCase", () => {
  const create = jest.fn(async (data) => ({ id: "manual-1", status: "PENDING", ...data }));
  const useCase = new CreateManualWeatherAlertUseCase({ create } as unknown as WeatherAlertRepository);
  const input = () => ({
    phenomenon: "GRANIZO", criticality: "ALTA",
    locationIds: [weatherLocations[0].id, weatherLocations[1].id],
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 3600_000).toISOString(),
    reason: "Aviso corroborado", source: "Referencia oficial", actorSub: "admin-1"
  });

  it("resuelve coordenadas del catalogo y conserva la trazabilidad sin mediciones inventadas", async () => {
    const result = await useCase.execute(input());
    expect(result.status).toBe("PENDING");
    expect(result.evidence.provider).toBe("MANUAL");
    expect(result.evidence.locations).toHaveLength(2);
    expect(result.evidence.locations?.[0]).toEqual({
      latitude: weatherLocations[0].latitude, longitude: weatherLocations[0].longitude
    });
    expect(result.evidence.manual?.createdBy).toBe("admin-1");
    expect(result.evidence.maxWindGustKmh).toBeUndefined();
  });

  it.each([
    { windGustKmh: -1 },
    { precipitationMm: "12" },
    { temperatureMinC: 40, temperatureMaxC: 30 },
    { temperatureMinC: NaN },
    { locationIds: [] },
    { locationIds: ["DESCONOCIDO"] },
    { source: "" },
    { reason: "" },
    { actorSub: "" },
    { phenomenon: "DESCONOCIDO" },
    { criticality: "EXTREMA" },
    { validUntil: "2020-01-01T00:00:00Z" }
  ])("rechaza entradas invalidas %j", async (invalid) => {
    await expect(useCase.execute({ ...input(), ...invalid })).rejects.toThrow();
  });

  it("conserva ceros y temperaturas negativas sin confundirlos con datos ausentes", async () => {
    const result = await useCase.execute({ ...input(), windGustKmh: 0, precipitationMm: 0,
      temperatureMinC: -5, temperatureMaxC: 0 });
    expect(result.evidence).toMatchObject({
      maxWindGustKmh: 0, accumulatedPrecipitationMm: 0, temperatureMinC: -5, temperatureMaxC: 0
    });
  });
});
