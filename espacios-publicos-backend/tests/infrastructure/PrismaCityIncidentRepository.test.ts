const cityIncident = {
  findUnique: jest.fn(),
  upsert: jest.fn(),
  updateMany: jest.fn()
};

jest.mock("../../src/infrastructure/database/prismaClient", () => ({ prisma: { cityIncident } }));

import { PrismaCityIncidentRepository } from "../../src/infrastructure/database/PrismaCityIncidentRepository";

const where = { source_externalId: { source: "EMERGENCIAS", externalId: "emg-1" } };
const alta = { source: "EMERGENCIAS" as const, externalId: "emg-1", category: "INCENDIO", latitude: -34.6037, longitude: -58.3816, zone: "San Nicolás" };

describe("PrismaCityIncidentRepository: el bus no garantiza el orden", () => {
  beforeEach(() => jest.clearAllMocks());

  it("un alta que llega despues del cierre definitivo no reactiva el incidente", async () => {
    cityIncident.findUnique.mockResolvedValue({ closedAt: new Date("2026-11-16T12:00:00Z") });

    await new PrismaCityIncidentRepository().upsertActive(alta);

    expect(cityIncident.upsert).not.toHaveBeenCalled();
  });

  it("un alta de un incidente nuevo o reactivable lo deja activo", async () => {
    cityIncident.findUnique.mockResolvedValue({ closedAt: null });

    await new PrismaCityIncidentRepository().upsertActive(alta);

    expect(cityIncident.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where,
      update: expect.objectContaining({ active: true }),
      create: expect.objectContaining({ active: true })
    }));
  });

  it("un cierre que llega antes que el alta queda anotado, inactivo y con fecha de cierre", async () => {
    await new PrismaCityIncidentRepository().deactivate("EMERGENCIAS", "emg-1");

    const [args] = cityIncident.upsert.mock.calls[0];
    expect(args.where).toEqual(where);
    expect(args.create).toEqual(expect.objectContaining({ source: "EMERGENCIAS", externalId: "emg-1", active: false, closedAt: expect.any(Date) }));
    expect(args.update).toEqual({ active: false, closedAt: expect.any(Date) });
  });

  it("la baja por reclasificacion no marca cierre definitivo", async () => {
    await new PrismaCityIncidentRepository().deactivateUntilReactivated("RECLAMOS", "rec-1");

    expect(cityIncident.updateMany).toHaveBeenCalledWith({ where: { source: "RECLAMOS", externalId: "rec-1" }, data: { active: false } });
    expect(cityIncident.upsert).not.toHaveBeenCalled();
  });
});
