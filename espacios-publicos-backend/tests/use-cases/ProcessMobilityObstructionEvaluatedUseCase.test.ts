import { ProcessMobilityObstructionEvaluatedUseCase } from "../../src/application/use-cases/ProcessMobilityObstructionEvaluatedUseCase";
import { InMemoryTowInterventionRepository } from "../../src/infrastructure/database/InMemoryTowInterventionRepository";

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

describe("ProcessMobilityObstructionEvaluatedUseCase", () => {
  it("deja pendiente una intervencion que requiere grua", async () => {
    const repository = new InMemoryTowInterventionRepository();
    const useCase = new ProcessMobilityObstructionEvaluatedUseCase(repository);

    const intervention = await useCase.execute(input);

    expect(intervention).toMatchObject({
      reclamoId: "reclamo-1",
      correlationId: "correlation-1",
      requiereGrua: true,
      status: "PENDING",
      solicitadoAt: null,
      resueltoAt: null
    });
  });

  it("finaliza automaticamente una intervencion que no requiere grua", async () => {
    const repository = new InMemoryTowInterventionRepository();
    const resolvedAt = new Date("2026-11-04T12:10:00.000Z");
    const useCase = new ProcessMobilityObstructionEvaluatedUseCase(
      repository,
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
  });

  it("no crea dos intervenciones para el mismo reclamo", async () => {
    const repository = new InMemoryTowInterventionRepository();
    const useCase = new ProcessMobilityObstructionEvaluatedUseCase(repository);

    const first = await useCase.execute(input);
    const second = await useCase.execute(input);

    expect(second.id).toBe(first.id);
    expect(await repository.findAll()).toHaveLength(1);
  });

  it("rechaza coordenadas invalidas", async () => {
    const repository = new InMemoryTowInterventionRepository();
    const useCase = new ProcessMobilityObstructionEvaluatedUseCase(repository);

    await expect(
      useCase.execute({
        ...input,
        latitud: 100
      })
    ).rejects.toThrow("Las coordenadas de la obstruccion no son validas.");
  });
});
