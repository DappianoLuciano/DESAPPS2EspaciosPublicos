import { InMemoryTowInterventionRepository } from "../../src/infrastructure/database/InMemoryTowInterventionRepository";

const interventionData = {
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
  evaluadoAt: new Date("2026-11-04T12:00:00.000Z")
};

describe("InMemoryTowInterventionRepository", () => {
  it("crea y recupera una intervencion pendiente", async () => {
    const repository = new InMemoryTowInterventionRepository();

    const created = await repository.create(interventionData);
    const stored = await repository.findById(created.id);

    expect(created).toMatchObject({
      reclamoId: "reclamo-1",
      requiereGrua: true,
      patente: null,
      status: "PENDING",
      solicitadoAt: null,
      resueltoAt: null
    });
    expect(stored).toEqual(created);
    expect(await repository.findByReclamoId("reclamo-1")).toEqual(created);
  });

  it("actualiza una intervencion existente", async () => {
    const repository = new InMemoryTowInterventionRepository();
    const created = await repository.create(interventionData);

    const updated = await repository.update({
      ...created,
      patente: "AB123CD",
      status: "TOW_REQUESTED",
      solicitadoAt: new Date("2026-11-04T12:05:00.000Z")
    });

    expect(await repository.findById(created.id)).toEqual(updated);
    expect(updated).toMatchObject({
      patente: "AB123CD",
      status: "TOW_REQUESTED"
    });
  });

  it("no expone referencias mutables del almacenamiento interno", async () => {
    const repository = new InMemoryTowInterventionRepository();
    const created = await repository.create(interventionData);

    created.estacionesAfectadasIds.push(99);
    created.evaluadoAt.setFullYear(2030);

    const stored = await repository.findById(created.id);

    expect(stored?.estacionesAfectadasIds).toEqual([10, 11]);
    expect(stored?.evaluadoAt.toISOString()).toBe("2026-11-04T12:00:00.000Z");
  });
});
