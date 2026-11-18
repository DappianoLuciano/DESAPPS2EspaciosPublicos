import { PrismaTowInterventionRepository } from "../../src/infrastructure/database/PrismaTowInterventionRepository";

const now = new Date("2026-11-15T12:00:00.000Z");
const row = {
  id: "intervention-1",
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
  patente: null,
  status: "PENDING" as const,
  evaluadoAt: now,
  solicitadoAt: null,
  resueltoAt: null,
  createdAt: now,
  updatedAt: now
};

function createRepository() {
  const delegate = {
    create: jest.fn().mockResolvedValue(row),
    findMany: jest.fn().mockResolvedValue([row]),
    findUnique: jest.fn().mockResolvedValue(row),
    update: jest.fn().mockResolvedValue({
      ...row,
      patente: "AB123CD",
      status: "TOW_REQUESTED" as const,
      solicitadoAt: now
    })
  };
  const repository = new PrismaTowInterventionRepository({
    towIntervention: delegate
  } as never);

  return { repository, delegate };
}

describe("PrismaTowInterventionRepository", () => {
  it("crea y transforma una intervencion persistente", async () => {
    const { repository, delegate } = createRepository();

    const created = await repository.create({
      reclamoId: row.reclamoId,
      latitud: row.latitud,
      longitud: row.longitud,
      direccion: row.direccion,
      barrio: row.barrio,
      afectaCiclovia: row.afectaCiclovia,
      estacionesAfectadasIds: row.estacionesAfectadasIds,
      impactoCirculacion: row.impactoCirculacion,
      desvioSugerido: row.desvioSugerido,
      requiereIntervencionInmediata: row.requiereIntervencionInmediata,
      requiereGrua: row.requiereGrua,
      evaluadoAt: row.evaluadoAt
    });

    expect(delegate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reclamoId: "reclamo-1",
        correlationId: "reclamo-1",
        estacionesAfectadasIds: [10, 11]
      })
    });
    expect(created).toEqual(expect.objectContaining({
      id: "intervention-1",
      status: "PENDING",
      estacionesAfectadasIds: [10, 11]
    }));
    expect(created).not.toHaveProperty("correlationId");
  });

  it("lista por ultima actualizacion y devuelve copias de las fechas", async () => {
    const { repository, delegate } = createRepository();

    const result = await repository.findAll();

    expect(delegate.findMany).toHaveBeenCalledWith({
      orderBy: { updatedAt: "desc" }
    });
    expect(result[0].evaluadoAt).toEqual(now);
    expect(result[0].evaluadoAt).not.toBe(now);
  });

  it("persiste la solicitud de grua", async () => {
    const { repository, delegate } = createRepository();

    const updated = await repository.update({
      ...row,
      patente: "AB123CD",
      status: "TOW_REQUESTED",
      solicitadoAt: now
    });

    expect(delegate.update).toHaveBeenCalledWith({
      where: { id: "intervention-1" },
      data: {
        patente: "AB123CD",
        status: "TOW_REQUESTED",
        solicitadoAt: now,
        resueltoAt: null
      }
    });
    expect(updated.status).toBe("TOW_REQUESTED");
  });
});
