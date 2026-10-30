import { ConfirmWeatherAlertUseCase } from "../../src/application/use-cases/ConfirmWeatherAlertUseCase";
import { PublishPendingOutboxEventsUseCase } from "../../src/application/use-cases/PublishPendingOutboxEventsUseCase";
import { WeatherAlert } from "../../src/domain/entities/WeatherAlert";
import { WeatherAlertRepository } from "../../src/domain/repositories/WeatherAlertRepository";

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
      actorSub: "admin-espacios"
    });
    expect(result.delivery).toEqual({ processed: 1, published: 1, failed: 0 });
  });
});
