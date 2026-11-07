import { CityPassEventGatewayBus } from "../../src/infrastructure/events/CityPassEventGatewayBus";
import { ConsoleEventBus } from "../../src/infrastructure/events/ConsoleEventBus";
import { OAuthServiceTokenProvider } from "../../src/infrastructure/auth/OAuthServiceTokenProvider";
import { logger } from "../../src/shared/logging/logger";
import { eventNames } from "../../src/shared/events/eventTypes";

describe("Mensajes climáticos visibles en la terminal", () => {
  let info: jest.SpyInstance;
  const provider = { getToken: jest.fn().mockResolvedValue("token-no-imprimir"), invalidate: jest.fn() };
  const bus = () => new CityPassEventGatewayBus("https://eda.test/api/v1", provider as unknown as OAuthServiceTokenProvider);
  const confirmed = () => ({ id: "local-confirmada", name: eventNames.weatherConfirmed(), occurredAt: new Date(), payload: {
    alertaId: "alerta-1", nivelCriticidad: "ALTA", fenomeno: "TORMENTA_ELECTRICA",
    ubicaciones: [{ latitud: -34.61, longitud: -58.38 }], barrios: ["MONSERRAT"],
    vigenciaDesde: 1900000000000, vigenciaHasta: 1900003600000,
    temperaturaMinC: null, temperaturaMaxC: 25, actorSub: "admin-test"
  } });
  const finalized = () => ({ id: "local-finalizada", name: eventNames.weatherFinalized(), occurredAt: new Date(),
    payload: { alertaId: "alerta-1", finalizadaEn: 1900003600000, actorSub: "admin-test" } });

  beforeEach(() => {
    info = jest.spyOn(logger, "info").mockImplementation(() => undefined);
    provider.getToken.mockClear(); provider.invalidate.mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it.each([confirmed, finalized])("muestra exactamente el payload enviado después de la aceptación de EDA", async createEvent => {
    const event = createEvent();
    const fetch = jest.spyOn(global, "fetch").mockResolvedValue(new Response("", { status: 202 }));
    await bus().publish(event);
    expect(fetch).toHaveBeenCalledWith(`https://eda.test/api/v1/event-types/${event.name}/events`, expect.objectContaining({
      method: "POST", body: JSON.stringify(event.payload)
    }));
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith({ eventId: event.id, eventName: event.name, statusCode: 202,
      driver: "citypass", payload: event.payload }, "Evento aceptado por el gateway EDA");
    expect(JSON.stringify(info.mock.calls)).not.toContain("token-no-imprimir");
  });

  it("no informa envío aceptado si el gateway falla", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(new Response("Fallo", { status: 503 }));
    await expect(bus().publish(confirmed())).rejects.toThrow("503");
    expect(info).not.toHaveBeenCalled();
  });

  it("la renovación de token no duplica el mensaje de éxito", async () => {
    jest.spyOn(global, "fetch").mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValueOnce(new Response("", { status: 202 }));
    await bus().publish(finalized());
    expect(provider.invalidate).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledTimes(1);
  });

  it.each([confirmed, finalized])("en consola local muestra el payload, identificado como simulación", async createEvent => {
    const event = createEvent();
    await new ConsoleEventBus().publish(event);
    expect(info).toHaveBeenCalledWith(expect.objectContaining({ driver: "console", simulated: true, payload: event.payload }), "[EventBus]");
  });

  it("no agrega payloads de otros tipos de eventos a los logs", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(new Response("", { status: 202 }));
    const event = { ...finalized(), name: "otro.evento", payload: { citizenEmail: "privado@test.invalid" } };
    await bus().publish(event);
    await new ConsoleEventBus().publish(event);
    expect(JSON.stringify(info.mock.calls)).not.toContain("privado@test.invalid");
  });
});
