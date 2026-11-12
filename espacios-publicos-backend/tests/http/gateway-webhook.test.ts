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
const MOBILITY_OBSTRUCTION_TYPE =
  "com.citypass.movilidad.MovilidadObstruccionEvaluada";

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
    findActiveInBounds: jest.fn(),
    findActiveWithoutCoordinatesWithZone: jest.fn()
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
  const processMobilityObstructionEvaluatedUseCase = {
    execute: jest.fn().mockResolvedValue({})
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
            communityEventRepository,
            processMobilityObstructionEvaluatedUseCase
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
    processMobilityObstructionEvaluatedUseCase.execute.mockClear();
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
        longitude: -58.4,
        zone: null
      });
      expect(inboundRepository.record).toHaveBeenCalledWith(
        "evt-1",
        "com.citypass.reclamos.ReclamoCreado"
      );
    });

    describe("Emergencias (contrato real: barrio, sin coordenadas ni afectaCirculacion)", () => {
      const CREADA = "com.citypass.emergencias.EmergenciaCreada";
      const ACTUALIZADA = "com.citypass.emergencias.EmergenciaActualizada";

      function emergencia(overrides: Record<string, unknown> = {}) {
        return {
          emergenciaId: "emg-7",
          estado: "ACTIVA",
          ubicacion: { barrio: "Villa Pueyrredón" },
          tipo: "INCENDIO",
          severity: "ALTA",
          createdAt: "2030-01-01T10:00:00.000Z",
          updatedAt: "2030-01-01T10:00:00.000Z",
          ...overrides
        };
      }

      it("da de alta por barrio, con tipo como categoria y sin coordenadas", async () => {
        await post(envelope({ eventType: CREADA, data: emergencia() })).expect(204);

        expect(cityIncidentRepository.upsertActive).toHaveBeenCalledWith({
          source: "EMERGENCIAS",
          externalId: "emg-7",
          category: "INCENDIO",
          latitude: null,
          longitude: null,
          zone: "Villa Pueyrredón"
        });
        expect(inboundRepository.record).toHaveBeenCalledWith("evt-1", CREADA);
      });

      it("no filtra por tipo", async () => {
        await post(envelope({ eventType: CREADA, data: emergencia({ tipo: "MEDICA" }) })).expect(204);

        expect(cityIncidentRepository.upsertActive).toHaveBeenCalledWith(
          expect.objectContaining({ category: "MEDICA" })
        );
      });

      it.each([
        ["barrio null", { ubicacion: { barrio: null } }],
        ["barrio vacio", { ubicacion: { barrio: "  " } }],
        ["sin ubicacion", { ubicacion: null }],
        ["sin emergenciaId", { emergenciaId: undefined }]
      ])("ignora una emergencia con %s", async (_label, overrides) => {
        await post(envelope({ eventType: CREADA, data: emergencia(overrides) })).expect(204);

        expect(cityIncidentRepository.upsertActive).not.toHaveBeenCalled();
        expect(inboundRepository.record).not.toHaveBeenCalled();
      });

      it("no da de alta una emergencia que ya llega en estado terminal", async () => {
        await post(envelope({ eventType: CREADA, data: emergencia({ estado: "RESUELTA" }) })).expect(204);

        expect(cityIncidentRepository.upsertActive).not.toHaveBeenCalled();
      });

      it("cierra con data.estado", async () => {
        await post(
          envelope({ eventType: ACTUALIZADA, data: emergencia({ estado: "CERRADA" }) })
        ).expect(204);

        expect(cityIncidentRepository.deactivate).toHaveBeenCalledWith("EMERGENCIAS", "emg-7");
      });

      it("cierra con data.estadoNuevo si no viene data.estado", async () => {
        await post(
          envelope({ eventType: ACTUALIZADA, data: { emergenciaId: "emg-7", estadoNuevo: "RESUELTA" } })
        ).expect(204);

        expect(cityIncidentRepository.deactivate).toHaveBeenCalledWith("EMERGENCIAS", "emg-7");
      });

      it("no cierra si data.estado no es terminal", async () => {
        await post(
          envelope({ eventType: ACTUALIZADA, data: emergencia({ estado: "EN_CURSO" }) })
        ).expect(204);

        expect(cityIncidentRepository.deactivate).not.toHaveBeenCalled();
      });

      it("acepta el sobre con metadata.type sin namespace y lo resuelve al FQN", async () => {
        await post({
          metadata: { eventId: "evt-t1", type: "EmergenciaCreada" },
          data: emergencia()
        }).expect(204);

        expect(cityIncidentRepository.upsertActive).toHaveBeenCalledWith(
          expect.objectContaining({ source: "EMERGENCIAS", zone: "Villa Pueyrredón" })
        );
        expect(inboundRepository.record).toHaveBeenCalledWith("evt-t1", CREADA);
      });

      it("ignora un tipo sin namespace que no corresponde a ningun FQN conocido", async () => {
        await post({ metadata: { eventId: "evt-t2", type: "AlgoDesconocido" }, data: emergencia() }).expect(204);

        expect(cityIncidentRepository.upsertActive).not.toHaveBeenCalled();
        expect(inboundRepository.record).not.toHaveBeenCalled();
      });
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

  describe("MovilidadObstruccionEvaluada", () => {
    const mobilityData = {
      reclamoId: "reclamo-movilidad-1",
      correlationId: "correlation-movilidad-1",
      latitud: -34.6037,
      longitud: -58.3816,
      direccion: "Av. Corrientes 1000",
      barrio: "San Nicolas",
      afectaCiclovia: true,
      estacionesAfectadasIds: [10, 11],
      impactoCirculacion: "ALTO",
      desvioSugerido: "Av. Cordoba",
      requiereIntervencionInmediata: true,
      requiereGrua: true,
      evaluadoAt: 1793800000000
    };

    it("envia el payload al caso de uso de intervenciones y registra el evento", async () => {
      await post(
        envelope({
          eventId: "evt-movilidad-1",
          eventType: MOBILITY_OBSTRUCTION_TYPE,
          data: mobilityData
        })
      ).expect(204);

      expect(processMobilityObstructionEvaluatedUseCase.execute).toHaveBeenCalledWith(
        mobilityData
      );
      expect(inboundRepository.record).toHaveBeenCalledWith(
        "evt-movilidad-1",
        MOBILITY_OBSTRUCTION_TYPE
      );
    });

    it("normaliza los textos del payload antes de procesarlo", async () => {
      await post(
        envelope({
          eventId: "evt-movilidad-normalizado",
          eventType: MOBILITY_OBSTRUCTION_TYPE,
          data: {
            ...mobilityData,
            reclamoId: "  reclamo-movilidad-2  ",
            correlationId: "  correlation-movilidad-2  ",
            direccion: "  Av. Santa Fe 2000  ",
            barrio: "  Recoleta  "
          }
        })
      ).expect(204);

      expect(processMobilityObstructionEvaluatedUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          reclamoId: "reclamo-movilidad-2",
          correlationId: "correlation-movilidad-2",
          direccion: "Av. Santa Fe 2000",
          barrio: "Recoleta"
        })
      );
    });

    it.each([
      ["requiereGrua ausente", { requiereGrua: undefined }],
      ["reclamoId vacio", { reclamoId: "   " }],
      ["latitud fuera de rango", { latitud: 91 }],
      ["evaluadoAt invalido", { evaluadoAt: "hoy" }]
    ])("rechaza un payload con %s", async (_label, invalidData) => {
      await post(
        envelope({
          eventId: `evt-movilidad-invalido-${String(_label)}`,
          eventType: MOBILITY_OBSTRUCTION_TYPE,
          data: { ...mobilityData, ...invalidData }
        })
      ).expect(400);

      expect(processMobilityObstructionEvaluatedUseCase.execute).not.toHaveBeenCalled();
    });

    it("no vuelve a procesar el mismo eventId", async () => {
      recorded.add("evt-movilidad-duplicado");

      await post(
        envelope({
          eventId: "evt-movilidad-duplicado",
          eventType: MOBILITY_OBSTRUCTION_TYPE,
          data: mobilityData
        })
      ).expect(204);

      expect(processMobilityObstructionEvaluatedUseCase.execute).not.toHaveBeenCalled();
    });

    it("no registra el evento si falla la logica de intervenciones", async () => {
      processMobilityObstructionEvaluatedUseCase.execute.mockRejectedValueOnce(
        new Error("fallo de procesamiento")
      );

      await post(
        envelope({
          eventId: "evt-movilidad-error",
          eventType: MOBILITY_OBSTRUCTION_TYPE,
          data: mobilityData
        })
      ).expect(500);

      expect(inboundRepository.record).not.toHaveBeenCalledWith(
        "evt-movilidad-error",
        MOBILITY_OBSTRUCTION_TYPE
      );
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
