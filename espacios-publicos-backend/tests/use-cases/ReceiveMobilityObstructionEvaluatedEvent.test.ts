import {
  MOBILITY_OBSTRUCTION_EVALUATED_EVENT_TYPE,
  ReceiveGatewayEventUseCase
} from "../../src/application/use-cases/ReceiveGatewayEventUseCase";
import { ProcessMobilityObstructionEvaluatedUseCase } from "../../src/application/use-cases/ProcessMobilityObstructionEvaluatedUseCase";
import { DomainEvent } from "../../src/domain/entities/DomainEvent";
import { CityIncidentRepository } from "../../src/domain/repositories/CityIncidentRepository";
import { DestinationRecommendationRepository } from "../../src/domain/repositories/DestinationRecommendationRepository";
import { InboundEventRepository } from "../../src/domain/repositories/InboundEventRepository";
import { InMemoryEventOutboxRepository } from "../../src/infrastructure/database/InMemoryEventOutboxRepository";
import { InMemoryTowInterventionRepository } from "../../src/infrastructure/database/InMemoryTowInterventionRepository";

const mobilityData = {
  reclamoId: "reclamo-integracion-1",
  correlationId: "correlation-integracion-1",
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
  evaluadoAt: Date.parse("2026-11-12T12:00:00.000Z")
};

function createScenario() {
  const recorded = new Set<string>();
  const published: DomainEvent[] = [];
  const interventions = new InMemoryTowInterventionRepository();
  const outbox = new InMemoryEventOutboxRepository();
  const inbound: InboundEventRepository = {
    exists: async eventId => recorded.has(eventId),
    record: async eventId => void recorded.add(eventId)
  };
  const cityIncidents: CityIncidentRepository = {
    upsertActive: jest.fn(),
    deactivate: jest.fn(),
    findActiveInBounds: jest.fn(),
    findActiveWithoutCoordinatesWithZone: jest.fn()
  };
  const recommendations: DestinationRecommendationRepository = {
    findByEventId: jest.fn(),
    saveIfNewer: jest.fn()
  };
  const processMobility = new ProcessMobilityObstructionEvaluatedUseCase(
    interventions,
    outbox,
    { publish: async event => void published.push(event) },
    () => new Date("2026-11-12T12:10:00.000Z")
  );
  const receiver = new ReceiveGatewayEventUseCase(
    inbound,
    cityIncidents,
    recommendations,
    { findById: jest.fn() },
    processMobility
  );

  return { receiver, recorded, published, interventions, outbox };
}

function envelope(eventId: string, requiereGrua: boolean) {
  return {
    metadata: {
      eventId,
      eventType: MOBILITY_OBSTRUCTION_EVALUATED_EVENT_TYPE
    },
    data: {
      ...mobilityData,
      reclamoId: `${mobilityData.reclamoId}-${eventId}`,
      requiereGrua
    }
  };
}

describe("recepcion simulada de MovilidadObstruccionEvaluada", () => {
  it("deja el caso pendiente para el administrador cuando requiereGrua es true", async () => {
    const scenario = createScenario();

    await expect(
      scenario.receiver.execute(envelope("evento-con-grua", true))
    ).resolves.toBe("processed");

    expect(await scenario.interventions.findAll()).toEqual([
      expect.objectContaining({
        requiereGrua: true,
        status: "PENDING",
        solicitadoAt: null,
        resueltoAt: null
      })
    ]);
    expect(await scenario.outbox.findReady(10, new Date())).toHaveLength(0);
    expect(scenario.published).toHaveLength(0);
    expect(scenario.recorded).toContain("evento-con-grua");
  });

  it("finaliza y publica IntervencionFinalizada cuando requiereGrua es false", async () => {
    const scenario = createScenario();

    await expect(
      scenario.receiver.execute(envelope("evento-sin-grua", false))
    ).resolves.toBe("processed");

    expect(await scenario.interventions.findAll()).toEqual([
      expect.objectContaining({
        requiereGrua: false,
        status: "COMPLETED",
        solicitadoAt: null,
        resueltoAt: new Date("2026-11-12T12:10:00.000Z")
      })
    ]);
    expect(scenario.published).toEqual([
      expect.objectContaining({
        name: "com.citypass.espacios.IntervencionFinalizada",
        payload: expect.objectContaining({
          resultado: "RESUELTO",
          idAuto: null,
          solicitadoAt: null,
          resueltoAt: Date.parse("2026-11-12T12:10:00.000Z")
        })
      })
    ]);
    expect(await scenario.outbox.findReady(10, new Date())).toHaveLength(1);
    expect(scenario.recorded).toContain("evento-sin-grua");
  });
});
