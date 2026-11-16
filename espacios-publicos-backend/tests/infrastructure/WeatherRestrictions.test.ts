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
    weatherRestriction: { findMany: jest.fn().mockResolvedValue([]), createMany: jest.fn(), updateMany: jest.fn() },
    eventOutbox: { create: jest.fn() }
  };
  // Registra si cada escritura al outbox y cada publicacion al bus ocurren dentro de la transaccion.
  let inTransaction = false;
  const timeline: string[] = [];
  (prisma.$transaction as jest.Mock).mockImplementation(async run => {
    inTransaction = true;
    try { return await run(tx); } finally { inTransaction = false; }
  });
  tx.eventOutbox.create.mockImplementation(async () => { timeline.push(inTransaction ? "outbox:tx" : "outbox:fuera"); });
  const bus = { publish: jest.fn(async () => { timeline.push(inTransaction ? "bus:tx" : "bus:despues"); }) };
  const repository = new PrismaWeatherRestrictionRepository(undefined, undefined, bus);
  return { repository, tx, alert, event, bus, timeline };
}

const outboxRows = (tx: ReturnType<typeof setup>["tx"]) =>
  tx.eventOutbox.create.mock.calls.map(([args]) => args.data);

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
  describe("ActividadModificada por medidas climáticas", () => {
    it.each(["ACTIVE", "ACTIVE_FULL"])("aplicar medidas a un evento %s publica SUSPENDIDA con la causa climática", async status => {
      const { repository, tx, event, bus, timeline } = setup(); event.status = status;
      const before = Date.now();
      await repository.apply("a1", { spaceIds: [], eventIds: ["e1"], reason: "Tormenta fuerte" }, "admin-sub");

      const rows = outboxRows(tx);
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe("com.citypass.espacios.ActividadModificada");
      expect(rows[0].payload).toEqual({
        correlationId: "act-e1",
        actividadId: "e1",
        estadoAnterior: "PROGRAMADA",
        estadoNuevo: "SUSPENDIDA",
        motivo: "Tormenta fuerte",
        causaId: "a1",
        causaTipo: "EVENTO_CLIMATICO",
        modificadaEn: expect.any(Number),
        actorSub: "admin-sub"
      });
      expect(rows[0].payload.modificadaEn).toBeGreaterThanOrEqual(before);
      expect(rows[0].occurredAt.getTime()).toBe(rows[0].payload.modificadaEn);
      // Misma fila en el outbox (dentro de la transaccion) y en el bus (despues del commit).
      expect(bus.publish).toHaveBeenCalledWith(expect.objectContaining({ id: rows[0].id, payload: rows[0].payload }));
      expect(timeline).toEqual(["outbox:tx", "bus:despues"]);
    });

    it("levantar las medidas que reanudan el evento publica PROGRAMADA con la misma causa y sin motivo", async () => {
      const { repository, tx, alert, event, bus, timeline } = setup(); alert.status = "FINALIZED"; event.status = "SUSPENDED";
      tx.weatherRestriction.findMany.mockResolvedValueOnce([{ communityEventId: "e1" }]);
      await repository.release("a1", "admin-sub");

      const rows = outboxRows(tx);
      expect(rows).toHaveLength(1);
      expect(rows[0].payload).toEqual({
        correlationId: "act-e1",
        actividadId: "e1",
        estadoAnterior: "SUSPENDIDA",
        estadoNuevo: "PROGRAMADA",
        motivo: null,
        causaId: "a1",
        causaTipo: "EVENTO_CLIMATICO",
        modificadaEn: expect.any(Number),
        actorSub: "admin-sub"
      });
      expect(bus.publish).toHaveBeenCalledTimes(1);
      expect(timeline).toEqual(["outbox:tx", "bus:despues"]);
    });

    it("aplicar medidas a un evento ya suspendido por otra alerta no publica", async () => {
      const { repository, tx, event, bus } = setup();
      Object.assign(event, { status: "SUSPENDED", weatherRestrictions: [{ alertId: "a2", releasedAt: null }] });
      await repository.apply("a1", { spaceIds: [], eventIds: ["e1"], reason: "Clima" }, "admin-sub");
      // La medida se registra igual, pero el estado no cambia.
      expect(tx.weatherRestriction.createMany).toHaveBeenCalled();
      expect(tx.eventOutbox.create).not.toHaveBeenCalled();
      expect(bus.publish).not.toHaveBeenCalled();
    });

    it.each([
      ["otra alerta mantiene la suspensión", { weatherRestrictions: [{ alertId: "a2", reason: "Otra alerta" }] }],
      ["el espacio está deshabilitado", { publicSpace: { status: "DISABLED" } }],
      ["el evento ya terminó", { endDate: new Date(Date.now() - 1) }],
      ["el evento fue cancelado", { status: "CANCELLED" }]
    ])("levantar medidas sin reanudar no publica: %s", async (_case, overrides) => {
      const { repository, tx, alert, event, bus } = setup(); alert.status = "FINALIZED";
      Object.assign(event, { status: "SUSPENDED" }, overrides);
      tx.weatherRestriction.findMany.mockResolvedValueOnce([{ communityEventId: "e1" }]);
      await repository.release("a1", "admin-sub");
      expect(tx.eventOutbox.create).not.toHaveBeenCalled();
      expect(bus.publish).not.toHaveBeenCalled();
    });

    it("medidas solo sobre espacios no publican ActividadModificada", async () => {
      const { repository, tx, bus } = setup();
      await repository.apply("a1", { spaceIds: ["s1"], eventIds: [], reason: "Clima" }, "admin-sub");
      expect(tx.eventOutbox.create).not.toHaveBeenCalled();
      expect(bus.publish).not.toHaveBeenCalled();
    });

    it("si la transacción falla no publica en el bus", async () => {
      const { repository, tx, bus } = setup();
      tx.communityEvent.updateMany.mockRejectedValueOnce(new Error("serialization"));
      await expect(repository.apply("a1", { spaceIds: [], eventIds: ["e1"], reason: "Clima" }, "admin-sub")).rejects.toThrow();
      expect(bus.publish).not.toHaveBeenCalled();
    });

    it("sin bus deja la fila en el outbox para el worker", async () => {
      const { tx } = setup();
      const repository = new PrismaWeatherRestrictionRepository();
      await repository.apply("a1", { spaceIds: [], eventIds: ["e1"], reason: "Clima" }, "admin-sub");
      expect(tx.eventOutbox.create).toHaveBeenCalledTimes(1);
    });
  });

  it("comprueba restricciones por id y cruce de horarios, no por zona global", async () => {
    const { repository } = setup(); (prisma.weatherRestriction.count as jest.Mock).mockResolvedValue(1);
    const from = new Date(), until = new Date(Date.now() + 1);
    expect(await repository.hasBlockingRestriction("s1", from, until)).toBe(true);
    expect(prisma.weatherRestriction.count).toHaveBeenCalledWith({ where: { publicSpaceId: "s1", releasedAt: null, validFrom: { lt: until }, validUntil: { gt: from } } });
  });
});
