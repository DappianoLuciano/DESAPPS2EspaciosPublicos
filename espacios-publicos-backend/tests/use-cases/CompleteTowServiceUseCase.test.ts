import { CompleteTowServiceUseCase } from "../../src/application/use-cases/CompleteTowServiceUseCase";
import { DomainEvent } from "../../src/domain/entities/DomainEvent";
import { InMemoryTowInterventionRepository } from "../../src/infrastructure/database/InMemoryTowInterventionRepository";

async function buildRequestedIntervention() {
  const repository = new InMemoryTowInterventionRepository();
  const created = await repository.create({
    reclamoId: "reclamo-1",
    correlationId: "correlation-1",
    latitud: -34.6037,
    longitud: -58.3816,
    direccion: "Av. Corrientes 1000",
    barrio: "San Nicolas",
    afectaCiclovia: true,
    estacionesAfectadasIds: [10],
    impactoCirculacion: "ALTO",
    desvioSugerido: "Av. Cordoba",
    requiereIntervencionInmediata: true,
    requiereGrua: true,
    evaluadoAt: new Date("2026-11-04T12:00:00.000Z")
  });
  const requestedAt = new Date("2026-11-04T12:05:00.000Z");
  const requested = await repository.update({
    ...created,
    patente: "AB123CD",
    status: "TOW_REQUESTED",
    solicitadoAt: requestedAt
  });
  return { repository, requested, requestedAt };
}

describe("CompleteTowServiceUseCase", () => {
  it("guarda y publica IntervencionFinalizada al completar la grua", async () => {
    const { repository, requested, requestedAt } = await buildRequestedIntervention();
    const resolvedAt = new Date("2026-11-04T12:20:00.000Z");
    const outbox: DomainEvent[] = [];
    const bus: DomainEvent[] = [];
    const useCase = new CompleteTowServiceUseCase(
      repository,
      { save: async event => void outbox.push(event) },
      { publish: async event => void bus.push(event) },
      () => resolvedAt
    );

    const completed = await useCase.execute({ interventionId: requested.id });

    expect(completed.status).toBe("COMPLETED");
    expect(outbox).toHaveLength(1);
    expect(bus).toEqual(outbox);
    expect(outbox[0]).toMatchObject({
      name: "com.citypass.espacios.IntervencionFinalizada",
      payload: {
        reclamoId: "reclamo-1",
        resultado: "RESUELTO",
        idAuto: "AB123CD",
        solicitadoAt: requestedAt.getTime(),
        resueltoAt: resolvedAt.getTime()
      }
    });
  });
});
