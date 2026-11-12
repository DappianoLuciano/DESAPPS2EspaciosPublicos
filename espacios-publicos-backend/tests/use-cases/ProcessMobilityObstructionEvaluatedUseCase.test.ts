import { ProcessMobilityObstructionEvaluatedUseCase } from "../../src/application/use-cases/ProcessMobilityObstructionEvaluatedUseCase";
import { InMemoryTowInterventionRepository } from "../../src/infrastructure/database/InMemoryTowInterventionRepository";
import { DomainEvent } from "../../src/domain/entities/DomainEvent";

const input = {
  reclamoId: "reclamo-1",
  correlationId: "correlation-1",
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
  evaluadoAt: Date.parse("2026-11-04T12:00:00.000Z")
};

function createUseCase(
  repository = new InMemoryTowInterventionRepository(),
  clock: () => Date = () => new Date()
) {
  const outbox: DomainEvent[] = [];
  const bus: DomainEvent[] = [];
  const useCase = new ProcessMobilityObstructionEvaluatedUseCase(
    repository,
    { save: async event => void outbox.push(event) },
    { publish: async event => void bus.push(event) },
    clock
  );
  return { useCase, repository, outbox, bus };
}

describe("ProcessMobilityObstructionEvaluatedUseCase", () => {
  it("deja pendiente una intervencion que requiere grua", async () => {
    const { repository, useCase, outbox } = createUseCase();

    const intervention = await useCase.execute(input);

    expect(intervention).toMatchObject({
      reclamoId: "reclamo-1",
      correlationId: "correlation-1",
      requiereGrua: true,
      status: "PENDING",
      solicitadoAt: null,
      resueltoAt: null
    });
    expect(outbox).toHaveLength(0);
  });

  it("finaliza automaticamente una intervencion que no requiere grua", async () => {
    const resolvedAt = new Date("2026-11-04T12:10:00.000Z");
    const { useCase, outbox, bus } = createUseCase(
      new InMemoryTowInterventionRepository(),
      () => resolvedAt
    );

    const intervention = await useCase.execute({
      ...input,
      requiereGrua: false
    });

    expect(intervention).toMatchObject({
      requiereGrua: false,
      patente: null,
      status: "COMPLETED",
      solicitadoAt: null,
      resueltoAt: resolvedAt
    });
    expect(outbox).toHaveLength(1);
    expect(bus).toEqual(outbox);
    expect(outbox[0]).toMatchObject({
      name: "com.citypass.espacios.IntervencionFinalizada",
      payload: {
        reclamoId: "reclamo-1",
        resultado: "RESUELTO",
        idAuto: null,
        solicitadoAt: null,
        resueltoAt: resolvedAt.getTime()
      }
    });
  });

  it("no crea dos intervenciones para el mismo reclamo", async () => {
    const { repository, useCase, outbox } = createUseCase();

    const first = await useCase.execute(input);
    const second = await useCase.execute(input);

    expect(second.id).toBe(first.id);
    expect(await repository.findAll()).toHaveLength(1);
    expect(outbox).toHaveLength(0);
  });

  it("rechaza coordenadas invalidas", async () => {
    const { useCase } = createUseCase();

    await expect(
      useCase.execute({
        ...input,
        latitud: 100
      })
    ).rejects.toThrow("Las coordenadas de la obstruccion no son validas.");
  });
});
