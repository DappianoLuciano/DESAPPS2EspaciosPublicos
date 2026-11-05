import { PrismaWeatherRestrictionRepository } from "../../src/infrastructure/database/PrismaWeatherRestrictionRepository";
import { prisma } from "../../src/infrastructure/database/prismaClient";

jest.mock("../../src/infrastructure/database/prismaClient", () => ({ prisma: { $transaction: jest.fn(), weatherRestriction: { count: jest.fn() } } }));

function setup() {
  const alert = { id: "a1", status: "CONFIRMED", latitude: -34.611, longitude: -58.383,
    validFrom: new Date(Date.now() + 3600_000), validUntil: new Date(Date.now() + 7200_000), evidence: {} };
  const space = { id: "s1", name: "Plaza", status: "ENABLED", exposure: "OUTDOOR", latitude: -34.611, longitude: -58.383 };
  const event = { id: "e1", title: "Feria", publicSpaceId: "s1", status: "ACTIVE", capacity: 10, requiresRegistration: true,
    startDate: alert.validFrom, endDate: alert.validUntil, weatherRestrictions: [], publicSpace: { status: "ENABLED" }, _count: { registrations: 10 } };
  const tx = {
    weatherAlert: { findUnique: jest.fn().mockResolvedValue(alert) },
    publicSpace: { findMany: jest.fn().mockResolvedValue([space]) },
    communityEvent: { findMany: jest.fn().mockResolvedValue([event]), updateMany: jest.fn(),
      findUnique: jest.fn().mockResolvedValue(event), update: jest.fn() },
    weatherRestriction: { findMany: jest.fn().mockResolvedValue([]), createMany: jest.fn(), updateMany: jest.fn() }
  };
  (prisma.$transaction as jest.Mock).mockImplementation(run => run(tx));
  const repository = new PrismaWeatherRestrictionRepository();
  return { repository, tx, alert, event };
}

describe("Medidas climáticas manuales", () => {
  beforeEach(() => jest.clearAllMocks());
  it("aplica únicamente la selección validada en una transacción Serializable, sin cambiar el estado del espacio", async () => {
    const { repository, tx } = setup();
    await repository.apply("a1", { spaceIds: ["s1", "s1"], eventIds: ["e1"], reason: "Clima adverso" }, "admin");
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
    const { data, skipDuplicates } = tx.weatherRestriction.createMany.mock.calls[0][0];
    expect(data).toHaveLength(2);
    expect(skipDuplicates).toBe(true);
    expect(data[0]).toEqual(expect.objectContaining({ alertId: "a1", publicSpaceId: "s1", reason: "Clima adverso", appliedBy: "admin" }));
    expect(tx.communityEvent.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "SUSPENDED", statusReason: "Clima adverso" } }));
  });
  it.each(["PENDING", "FINALIZED"])("no aplica una alerta %s", async status => {
    const { repository, tx, alert } = setup(); alert.status = status;
    await expect(repository.apply("a1", { spaceIds: ["s1"], eventIds: [], reason: "Clima" }, "admin")).rejects.toThrow("confirmada");
    expect(tx.weatherRestriction.createMany).not.toHaveBeenCalled();
  });
  it("no admite espacios ajenos ni selecciones vacías", async () => {
    const { repository, tx } = setup();
    await expect(repository.apply("a1", { spaceIds: ["otro"], eventIds: [], reason: "Clima" }, "admin")).rejects.toThrow("alcance");
    await expect(repository.apply("a1", { spaceIds: [], eventIds: [], reason: "Clima" }, "admin")).rejects.toThrow("al menos");
    expect(tx.weatherRestriction.createMany).not.toHaveBeenCalled();
  });
  it("no toma propiedad de una suspensión manual existente", async () => {
    const { repository, event } = setup(); event.status = "SUSPENDED";
    await expect(repository.apply("a1", { spaceIds: [], eventIds: ["e1"], reason: "Clima" }, "admin")).rejects.toThrow("alcance");
  });
  it("exige finalizar la alerta para levantar sus medidas", async () => {
    const { repository, tx } = setup();
    await expect(repository.release("a1", "admin")).rejects.toThrow("Finalizá");
    expect(tx.weatherRestriction.updateMany).not.toHaveBeenCalled();
  });
  it("reanuda respetando cupos y libera solo los registros de esta alerta", async () => {
    const { repository, tx, alert, event } = setup(); alert.status = "FINALIZED"; event.status = "SUSPENDED";
    tx.weatherRestriction.findMany.mockResolvedValueOnce([{ communityEventId: "e1" }]);
    await repository.release("a1", "admin");
    expect(tx.weatherRestriction.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { alertId: "a1", releasedAt: null } }));
    expect(tx.communityEvent.update).toHaveBeenCalledWith({ where: { id: "e1" }, data: { status: "ACTIVE_FULL", statusReason: null } });
  });
  it("no reactiva una cancelación definitiva", async () => {
    const { repository, tx, alert, event } = setup(); alert.status = "FINALIZED"; event.status = "CANCELLED";
    tx.weatherRestriction.findMany.mockResolvedValueOnce([{ communityEventId: "e1" }]);
    await repository.release("a1", "admin");
    expect(tx.communityEvent.update).not.toHaveBeenCalled();
  });
  it("otra alerta mantiene suspendido el evento", async () => {
    const { repository, tx, alert, event } = setup(); alert.status = "FINALIZED"; event.status = "SUSPENDED";
    Object.assign(event, { weatherRestrictions: [{ alertId: "a2", reason: "Otra alerta" }] });
    tx.weatherRestriction.findMany.mockResolvedValueOnce([{ communityEventId: "e1" }]);
    await repository.release("a1", "admin");
    expect(tx.communityEvent.update).toHaveBeenCalledWith({ where: { id: "e1" }, data: { statusReason: "Otra alerta" } });
  });
  it("un cierre administrativo del espacio impide reanudar el evento", async () => {
    const { repository, tx, alert, event } = setup(); alert.status = "FINALIZED"; event.status = "SUSPENDED"; event.publicSpace.status = "DISABLED";
    tx.weatherRestriction.findMany.mockResolvedValueOnce([{ communityEventId: "e1" }]);
    await repository.release("a1", "admin");
    expect(tx.communityEvent.update).toHaveBeenCalledWith(expect.objectContaining({ data: { statusReason: expect.stringContaining("Espacio deshabilitado") } }));
  });
  it("comprueba restricciones por id y cruce de horarios, no por zona global", async () => {
    const { repository } = setup(); (prisma.weatherRestriction.count as jest.Mock).mockResolvedValue(1);
    const from = new Date(), until = new Date(Date.now() + 1);
    expect(await repository.hasBlockingRestriction("s1", from, until)).toBe(true);
    expect(prisma.weatherRestriction.count).toHaveBeenCalledWith({ where: { publicSpaceId: "s1", releasedAt: null, validFrom: { lt: until }, validUntil: { gt: from } } });
  });
});
