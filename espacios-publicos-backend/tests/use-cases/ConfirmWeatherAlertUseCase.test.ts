import { ConfirmWeatherAlertUseCase } from "../../src/application/use-cases/ConfirmWeatherAlertUseCase";
import { PublishPendingOutboxEventsUseCase } from "../../src/application/use-cases/PublishPendingOutboxEventsUseCase";
import { WeatherAlert } from "../../src/domain/entities/WeatherAlert";
import { WeatherAlertRepository } from "../../src/domain/repositories/WeatherAlertRepository";
import { describeWeatherAlert, WEATHER_PHENOMENON_LABELS } from "../../src/domain/services/weatherDescription";

const current: WeatherAlert = {
  id: "alert-1",
  deduplicationKey: "risk-window-1",
  zone: "CABA",
  latitude: -34.6037,
  longitude: -58.3816,
  phenomenon: "TORMENTA_FUERTE",
  suggestedCriticality: "ALTA",
  confirmedCriticality: null,
  status: "PENDING",
  validFrom: new Date(Date.now() + 60_000),
  validUntil: new Date(Date.now() + 3_600_000),
  evidence: {
    provider: "OPEN_METEO",
    forecastFrom: new Date().toISOString(),
    forecastTo: new Date(Date.now() + 3_600_000).toISOString(),
    maxWindGustKmh: 82,
    accumulatedPrecipitationMm: 45,
    weatherCodes: [95],
    evaluatedHours: 1
  },
  detectedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
};

describe("ConfirmWeatherAlertUseCase", () => {
  it("confirma y guarda el contrato EDA con la alerta en una sola operacion", async () => {
    const confirmWithEvent = jest.fn().mockImplementation(
      async (_id, criticality, validUntil, actorSub) => ({
        ...current,
        status: "CONFIRMED",
        confirmedCriticality: criticality,
        validUntil,
        confirmedBy: actorSub
      })
    );
    const repository = {
      findById: jest.fn().mockResolvedValue(current),
      confirmWithEvent
    } as unknown as WeatherAlertRepository;
    const publisher = {
      execute: jest.fn().mockResolvedValue({ processed: 1, published: 1, failed: 0 })
    } as unknown as PublishPendingOutboxEventsUseCase;
    const useCase = new ConfirmWeatherAlertUseCase(repository, publisher);
    const validUntil = new Date(Date.now() + 7_200_000);

    const result = await useCase.execute({
      alertId: current.id,
      criticality: "CRITICA",
      validUntil: validUntil.toISOString(),
      actorSub: "admin-espacios"
    });

    const event = confirmWithEvent.mock.calls[0][4];
    expect(event.name).toBe("com.citypass.espacios.CriticidadClimaticaConfirmada");
    expect(event.payload).toEqual({
      alertaId: "alert-1",
      nivelCriticidad: "CRITICA",
      fenomeno: "TORMENTA_FUERTE",
      ubicaciones: [{ latitud: -34.6037, longitud: -58.3816 }],
      barrios: ["SAN NICOLAS"],
      vigenciaDesde: current.validFrom.getTime(),
      vigenciaHasta: validUntil.getTime(),
      temperaturaMinC: null,
      temperaturaMaxC: null,
      actorSub: "admin-espacios",
      correlationId: "alerta-alert-1",
      occurredAt: event.occurredAt.toISOString(),
      descripcion: "Tormenta fuerte en CABA"
    });
    expect(event.payload).not.toHaveProperty("radioAfectacionKm");
    expect(event.payload.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(result.delivery).toEqual({ processed: 1, published: 1, failed: 0 });
  });
});

describe("descripcion de CriticidadClimaticaConfirmada", () => {
  it.each([
    ["TORMENTA_FUERTE", "Tormenta fuerte"], ["LLUVIA_INTENSA", "Lluvia intensa"], ["VIENTO_FUERTE", "Viento fuerte"],
    ["OLA_DE_CALOR", "Ola de calor"], ["OLA_DE_FRIO", "Ola de frío"], ["GRANIZO", "Granizo"],
    ["TORMENTA_ELECTRICA", "Tormenta eléctrica"], ["HURACAN", "Huracán"], ["NIEVE", "Nieve"]
  ] as const)("%s se lee como %s", (phenomenon, label) => {
    expect(WEATHER_PHENOMENON_LABELS[phenomenon]).toBe(label);
    expect(describeWeatherAlert(phenomenon, "Palermo")).toBe(`${label} en Palermo`);
  });

  it("sin zona describe solo el fenomeno", () => {
    expect(describeWeatherAlert("GRANIZO", "  ")).toBe("Granizo");
    expect(describeWeatherAlert("GRANIZO", null)).toBe("Granizo");
  });
});
