import express from "express";
import request from "supertest";
import { ReceiveGatewayEventUseCase } from "../../src/application/use-cases/ReceiveGatewayEventUseCase";
import { InboundEventRepository } from "../../src/domain/repositories/InboundEventRepository";
import { GatewayWebhookController } from "../../src/interfaces/http/controllers/GatewayWebhookController";
import { errorHandler } from "../../src/interfaces/http/middlewares/errorHandler";
import { requestContext } from "../../src/interfaces/http/middlewares/requestContext";
import { createWebhookRoutes } from "../../src/interfaces/http/routes/webhookRoutes";

const WEBHOOK_TOKEN = "token-de-prueba";
const RECOMMENDATION_TYPE = "com.citypass.movilidad.RecomendacionDestinoActualizada";

function envelope(overrides: { eventId?: string; eventType?: string; data?: unknown } = {}) {
  return {
    metadata: {
      eventId: overrides.eventId ?? "evt-1",
      eventType: overrides.eventType ?? "com.citypass.reclamos.ReclamoCreado",
      receivedAt: "2030-01-01T10:00:00.000Z"
    },
    data:
      "data" in overrides
        ? overrides.data
        : { reclamoId: "rec-1", afectaCirculacion: true, latitud: -34.6, longitud: -58.4, categoria: "BACHE" }
  };
}

describe("POST /webhooks/citypass", () => {
  const recorded = new Set<string>();
  const inboundRepository: InboundEventRepository = {
    exists: jest.fn(async (eventId: string) => recorded.has(eventId)),
    record: jest.fn(async (eventId: string) => {
      recorded.add(eventId);
    })
  };
  const cityIncidentRepository = {
    upsertActive: jest.fn().mockResolvedValue(undefined),
    deactivate: jest.fn().mockResolvedValue(undefined),
    findActiveInBounds: jest.fn()
  };
  // Fake en memoria con la misma regla "solo si es mas nueva" que la implementacion Prisma.
  const stored = new Map<string, { calculadaEn: Date; mensaje: string }>();
  const recommendationRepository = {
    findByEventId: jest.fn(),
    saveIfNewer: jest.fn(async (data: { eventoId: string; calculadaEn: Date; mensaje: string }) => {
      const current = stored.get(data.eventoId);

      if (current && current.calculadaEn >= data.calculadaEn) {
        return false;
      }

      stored.set(data.eventoId, data);
      return true;
    })
  };
  const knownEvents = new Set(["event-1"]);
  const communityEventRepository = {
    findById: jest.fn(async (id: string) => (knownEvents.has(id) ? ({ id } as never) : null))
  };

  function buildApp() {
    const app = express();
    app.use(requestContext);
    app.use(express.json());
    app.use(
      "/webhooks",
      createWebhookRoutes(
        new GatewayWebhookController(
          new ReceiveGatewayEventUseCase(
            inboundRepository,
            cityIncidentRepository,
            recommendationRepository,
            communityEventRepository
          )
        )
      )
    );
    app.use(errorHandler);
    return app;
  }

  function post(body: unknown) {
    return request(buildApp()).post(`/webhooks/citypass?token=${WEBHOOK_TOKEN}`).send(body as object);
  }

  beforeEach(() => {
    recorded.clear();
    stored.clear();
    process.env.GATEWAY_WEBHOOK_TOKEN = WEBHOOK_TOKEN;
  });

  afterAll(() => {
    delete process.env.GATEWAY_WEBHOOK_TOKEN;
  });

  describe("autenticacion", () => {
    it("responde 401 sin token o con token incorrecto", async () => {
      await request(buildApp()).post("/webhooks/citypass").send(envelope()).expect(401);
      await request(buildApp()).post("/webhooks/citypass?token=otro").send(envelope()).expect(401);

      expect(cityIncidentRepository.upsertActive).not.toHaveBeenCalled();
      expect(recommendationRepository.saveIfNewer).not.toHaveBeenCalled();
    });

    it("rechaza todo si el token no esta configurado", async () => {
      process.env.GATEWAY_WEBHOOK_TOKEN = "";

      await request(buildApp()).post("/webhooks/citypass?token=").send(envelope()).expect(401);
      await request(buildApp()).post("/webhooks/citypass").send(envelope()).expect(401);
    });

    it("responde 400 si el sobre esta mal formado", async () => {
      await post({}).expect(400);
      await post({ metadata: { eventId: "x" }, data: {} }).expect(400);
      await post({ metadata: { eventId: "x", eventType: "t" } }).expect(400);
      await post({ metadata: { eventType: "t" }, data: {} }).expect(400);
    });

    it("ignora con 204 los tipos que no maneja", async () => {
      await post(envelope({ eventType: "com.citypass.otro.Cosa", data: { x: 1 } })).expect(204);

      expect(inboundRepository.record).not.toHaveBeenCalled();
    });

    it("responde 500 y no registra el evento si el procesamiento falla", async () => {
      cityIncidentRepository.upsertActive.mockRejectedValueOnce(new Error("base caida"));

      await post(envelope()).expect(500);

      expect(inboundRepository.record).not.toHaveBeenCalled();
    });
  });

  describe("sobre y deduplicacion del gateway", () => {
    const delivery = (receivedAt: string) => ({
      metadata: {
        eventId: "evt-gw-1",
        eventType: "com.citypass.reclamos.ReclamoCreado",
        receivedAt,
        source: "reclamos",
        schemaId: 7
      },
      data: { reclamoId: "rec-9", afectaCirculacion: true, latitud: -34.6, longitud: -58.4, categoria: "BACHE" }
    });

    it("acepta el sobre { metadata, data } aunque metadata traiga campos extra", async () => {
      await post(delivery("2030-01-01T10:00:00.000Z")).expect(204);

      expect(cityIncidentRepository.upsertActive).toHaveBeenCalledWith(
        expect.objectContaining({ source: "RECLAMOS", externalId: "rec-9" })
      );
      expect(inboundRepository.record).toHaveBeenCalledWith("evt-gw-1", "com.citypass.reclamos.ReclamoCreado");
    });

    it("la reentrega at-least-once del mismo metadata.eventId se procesa una sola vez", async () => {
      await post(delivery("2030-01-01T10:00:00.000Z")).expect(204);
      await post(delivery("2030-01-01T10:05:00.000Z")).expect(204);
      await post(delivery("2030-01-01T10:10:00.000Z")).expect(204);

      expect(cityIncidentRepository.upsertActive).toHaveBeenCalledTimes(1);
      expect(inboundRepository.record).toHaveBeenCalledTimes(1);
    });

    it("un eventId distinto del mismo incidente si se procesa (cada entrega tiene su id)", async () => {
      await post(delivery("2030-01-01T10:00:00.000Z")).expect(204);
      await post({ ...delivery("2030-01-01T10:00:00.000Z"), metadata: { ...delivery("x").metadata, eventId: "evt-gw-2" } }).expect(204);

      expect(cityIncidentRepository.upsertActive).toHaveBeenCalledTimes(2);
    });
  });

  describe("incidentes", () => {
    it("da de alta el incidente activo con su ubicacion y categoria", async () => {
      await post(envelope()).expect(204);

      expect(cityIncidentRepository.upsertActive).toHaveBeenCalledWith({
        source: "RECLAMOS",
        externalId: "rec-1",
        category: "BACHE",
        latitude: -34.6,
        longitude: -58.4
      });
      expect(inboundRepository.record).toHaveBeenCalledWith(
        "evt-1",
        "com.citypass.reclamos.ReclamoCreado"
      );
    });

    it("da de alta emergencias usando emergenciaId", async () => {
      await post(
        envelope({
          eventType: "com.citypass.emergencias.EmergenciaCreada",
          data: { emergenciaId: "emg-7", afectaCirculacion: true, latitud: -34.5, longitud: -58.3, categoria: "INCENDIO" }
        })
      ).expect(204);

      expect(cityIncidentRepository.upsertActive).toHaveBeenCalledWith(
        expect.objectContaining({ source: "EMERGENCIAS", externalId: "emg-7", category: "INCENDIO" })
      );
    });

    it("ignora los que no afectan la circulacion o no traen coordenadas", async () => {
      await post(
        envelope({ data: { reclamoId: "rec-2", afectaCirculacion: false, latitud: -34.6, longitud: -58.4 } })
      ).expect(204);
      await post(envelope({ data: { reclamoId: "rec-3", afectaCirculacion: true } })).expect(204);

      expect(cityIncidentRepository.upsertActive).not.toHaveBeenCalled();
    });

    it.each([
      ["com.citypass.reclamos.ReclamoActualizado", "reclamoId", "RECLAMOS", "RESUELTO"],
      ["com.citypass.reclamos.ReclamoActualizado", "reclamoId", "RECLAMOS", "RECHAZADO"],
      ["com.citypass.reclamos.ReclamoActualizado", "reclamoId", "RECLAMOS", "CERRADO"],
      ["com.citypass.emergencias.EmergenciaActualizada", "emergenciaId", "EMERGENCIAS", "RESUELTA"],
      ["com.citypass.emergencias.EmergenciaActualizada", "emergenciaId", "EMERGENCIAS", "CERRADA"],
      ["com.citypass.emergencias.EmergenciaActualizada", "emergenciaId", "EMERGENCIAS", "DESCARTADA"],
      ["com.citypass.emergencias.EmergenciaActualizada", "emergenciaId", "EMERGENCIAS", "CANCELADA"]
    ])("cierra el incidente al recibir %s con estadoNuevo %s", async (eventType, idField, source, estadoNuevo) => {
      await post(envelope({ eventType, data: { [idField]: "inc-1", estadoNuevo } })).expect(204);

      expect(cityIncidentRepository.deactivate).toHaveBeenCalledWith(source, "inc-1");
    });

    it.each([
      ["com.citypass.reclamos.ReclamoActualizado", "reclamoId", "EN_PROCESO"],
      ["com.citypass.reclamos.ReclamoActualizado", "reclamoId", "RESUELTA"],
      ["com.citypass.emergencias.EmergenciaActualizada", "emergenciaId", "EN_CURSO"],
      ["com.citypass.emergencias.EmergenciaActualizada", "emergenciaId", "RESUELTO"]
    ])("ignora %s con estadoNuevo %s", async (eventType, idField, estadoNuevo) => {
      await post(envelope({ eventType, data: { [idField]: "inc-1", estadoNuevo } })).expect(204);

      expect(cityIncidentRepository.deactivate).not.toHaveBeenCalled();
    });

    it("no reprocesa un eventId duplicado", async () => {
      recorded.add("evt-1");

      await post(envelope()).expect(204);

      expect(cityIncidentRepository.upsertActive).not.toHaveBeenCalled();
    });
  });

  describe("RecomendacionDestinoActualizada", () => {
    function data(overrides: Record<string, unknown> = {}) {
      return {
        eventoId: "event-1",
        estado: "RECOMMENDED",
        estacionId: 30044,
        estacion: "DIAGONAL NORTE",
        latitud: -34.6046,
        longitud: -58.3798,
        lugaresLibres: 9,
        distanciaMetros: 193,
        mensaje: "Te recomendamos DIAGONAL NORTE",
        descartadasPorIncidentes: 2,
        calculadaEn: "2030-01-01T10:00:00.000Z",
        correlationId: "evento-event-1",
        ...overrides
      };
    }

    function send(eventId: string, payload: unknown) {
      return post(envelope({ eventId, eventType: RECOMMENDATION_TYPE, data: payload })).expect(204);
    }

    it("da de alta la recomendacion y guarda estacionId numerico como string", async () => {
      await send("evt-r1", data());

      expect(recommendationRepository.saveIfNewer).toHaveBeenCalledWith({
        eventoId: "event-1",
        estado: "RECOMMENDED",
        estacionId: "30044",
        estacion: "DIAGONAL NORTE",
        latitud: -34.6046,
        longitud: -58.3798,
        lugaresLibres: 9,
        distanciaMetros: 193,
        mensaje: "Te recomendamos DIAGONAL NORTE",
        descartadasPorIncidentes: 2,
        calculadaEn: new Date("2030-01-01T10:00:00.000Z"),
        correlationId: "evento-event-1"
      });
      expect(stored.get("event-1")?.mensaje).toBe("Te recomendamos DIAGONAL NORTE");
      expect(inboundRepository.record).toHaveBeenCalledWith("evt-r1", RECOMMENDATION_TYPE);
      expect(cityIncidentRepository.upsertActive).not.toHaveBeenCalled();
    });

    it("tambien acepta estacionId como string", async () => {
      await send("evt-r1", data({ estacionId: "ST-9" }));

      expect(recommendationRepository.saveIfNewer).toHaveBeenCalledWith(
        expect.objectContaining({ estacionId: "ST-9" })
      );
    });

    it("guarda NO_RECOMMENDATION con los opcionales en null", async () => {
      await send(
        "evt-r2",
        data({
          estado: "NO_RECOMMENDATION",
          estacionId: null,
          estacion: null,
          latitud: null,
          longitud: null,
          lugaresLibres: null,
          distanciaMetros: null,
          correlationId: null,
          mensaje: "Sin estaciones"
        })
      );

      expect(recommendationRepository.saveIfNewer).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: "NO_RECOMMENDATION",
          estacionId: null,
          estacion: null,
          latitud: null,
          lugaresLibres: null,
          distanciaMetros: null,
          correlationId: null
        })
      );
    });

    it("actualiza con una recomendacion mas nueva", async () => {
      await send("evt-r1", data());
      await send("evt-r2", data({ calculadaEn: "2030-01-01T10:15:00.000Z", mensaje: "Nueva" }));

      expect(stored.get("event-1")?.mensaje).toBe("Nueva");
    });

    it("descarta una recomendacion mas vieja que la guardada", async () => {
      await send("evt-r1", data({ calculadaEn: "2030-01-01T10:15:00.000Z", mensaje: "Nueva" }));
      await send("evt-r2", data({ calculadaEn: "2030-01-01T10:00:00.000Z", mensaje: "Vieja" }));

      expect(stored.get("event-1")?.mensaje).toBe("Nueva");
      expect(inboundRepository.record).not.toHaveBeenCalledWith("evt-r2", RECOMMENDATION_TYPE);
    });

    it("ignora con 204 una recomendacion de un evento que no existe", async () => {
      await send("evt-r3", data({ eventoId: "evento-desconocido" }));

      expect(recommendationRepository.saveIfNewer).not.toHaveBeenCalled();
      expect(stored.size).toBe(0);
    });

    it.each([
      ["sin estado valido", { estado: "OTRO" }],
      ["sin fecha de calculo", { calculadaEn: undefined }],
      ["con fecha invalida", { calculadaEn: "no es una fecha" }],
      ["sin eventoId", { eventoId: undefined }]
    ])("ignora una recomendacion %s", async (_label, overrides) => {
      await send("evt-r4", data(overrides));

      expect(recommendationRepository.saveIfNewer).not.toHaveBeenCalled();
    });

    it("no reprocesa un eventId duplicado", async () => {
      recorded.add("evt-r1");

      await send("evt-r1", data());

      expect(recommendationRepository.saveIfNewer).not.toHaveBeenCalled();
    });
  });
});
