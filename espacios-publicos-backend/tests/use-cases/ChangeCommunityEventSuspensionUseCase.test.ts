import { ChangeCommunityEventSuspensionUseCase } from "../../src/application/use-cases/ChangeCommunityEventSuspensionUseCase";
import { ActivityModifiedPublisher } from "../../src/application/events/activityModified";
import { CommunityEvent } from "../../src/domain/entities/CommunityEvent";
import { DomainEvent } from "../../src/domain/entities/DomainEvent";

const ACTIVITY_MODIFIED = "com.citypass.espacios.ActividadModificada";

function setup(status: CommunityEvent["status"] = "ACTIVE", count = 2, overrides: Partial<CommunityEvent> = {}) {
  const event: CommunityEvent = {
    id: "e1", title: "Feria", category: "Cultura", tags: [], description: "Descripción",
    requirements: [], publicSpaceId: "p1", organizerName: "Municipio", capacity: 3,
    requiresRegistration: true, startDate: new Date(Date.now() + 3600_000),
    endDate: new Date(Date.now() + 7200_000), createdAt: new Date(), status, ...overrides
  };
  const updateStatus = jest.fn(async (_id, next, reason) => ({ ...event, status: next, statusReason: reason }));
  const findById = jest.fn().mockResolvedValue(event);
  const countByEventId = jest.fn().mockResolvedValue(count);
  const saved: DomainEvent[] = [];
  const published: DomainEvent[] = [];
  const outbox = { save: jest.fn(async (domainEvent: DomainEvent) => { saved.push(domainEvent); }) };
  const bus = { publish: jest.fn(async (domainEvent: DomainEvent) => { published.push(domainEvent); }) };
  const snapshots = { publish: jest.fn() };
  const useCase = new ChangeCommunityEventSuspensionUseCase(
    { findById, updateStatus } as never, { countByEventId } as never, undefined,
    snapshots as never, new ActivityModifiedPublisher(outbox, bus)
  );
  return { useCase, updateStatus, countByEventId, findById, saved, published, snapshots };
}

describe("ActividadModificada en la suspensión y reanudación manual", () => {
  it.each(["ACTIVE", "ACTIVE_FULL"] as const)("suspender %s publica SUSPENDIDA con el motivo y sin causa", async status => {
    const { useCase, saved, published, snapshots } = setup(status);
    const before = Date.now();
    await useCase.execute("e1", "suspend", "  Corte de luz en el predio  ", "admin-sub");

    expect(snapshots.publish).toHaveBeenCalledWith(["e1"]);
    expect(saved).toHaveLength(1);
    expect(published).toEqual(saved);
    expect(saved[0].name).toBe(ACTIVITY_MODIFIED);
    const payload = saved[0].payload;
    expect(payload).toEqual({
      correlationId: "act-e1",
      actividadId: "e1",
      estadoAnterior: "PROGRAMADA",
      estadoNuevo: "SUSPENDIDA",
      motivo: "Corte de luz en el predio",
      causaId: null,
      causaTipo: null,
      modificadaEn: expect.any(Number),
      actorSub: "admin-sub"
    });
    expect(payload.modificadaEn).toBeGreaterThanOrEqual(before);
    expect(saved[0].occurredAt.getTime()).toBe(payload.modificadaEn);
  });

  it.each([[2, "ACTIVE"], [3, "ACTIVE_FULL"]] as const)("reanudar con %s inscriptos (%s) publica PROGRAMADA sin motivo ni causa", async (count, _status) => {
    const { useCase, saved, published } = setup("SUSPENDED", count);
    await useCase.execute("e1", "resume", undefined, "admin-sub");

    expect(saved).toHaveLength(1);
    expect(published).toEqual(saved);
    expect(saved[0].payload).toEqual({
      correlationId: "act-e1",
      actividadId: "e1",
      estadoAnterior: "SUSPENDIDA",
      estadoNuevo: "PROGRAMADA",
      motivo: null,
      causaId: null,
      causaTipo: null,
      modificadaEn: expect.any(Number),
      actorSub: "admin-sub"
    });
  });

  it("sin actor autenticado manda actorSub null", async () => {
    const { useCase, saved } = setup();
    await useCase.execute("e1", "suspend", "Clima");
    expect(saved[0].payload.actorSub).toBeNull();
  });

  it("si la operación se rechaza no publica nada", async () => {
    const { useCase, saved, published } = setup("SUSPENDED");
    await expect(useCase.execute("e1", "suspend", "Clima", "admin-sub")).rejects.toThrow("ya está");
    expect(saved).toHaveLength(0);
    expect(published).toHaveLength(0);
  });

  it("no publica si el estado cambió entre la lectura y la actualización", async () => {
    const { useCase, updateStatus, saved } = setup();
    updateStatus.mockRejectedValueOnce(new Error("El estado del evento cambió."));
    await expect(useCase.execute("e1", "suspend", "Clima", "admin-sub")).rejects.toThrow("cambió");
    expect(saved).toHaveLength(0);
  });
});

describe("Suspensión administrativa de eventos", () => {
  it.each(["ACTIVE", "ACTIVE_FULL"] as const)("suspende %s con motivo público sin eliminar inscripciones", async status => {
    const { useCase, updateStatus, countByEventId } = setup(status);
    expect((await useCase.execute("e1", "suspend", "  Alerta climática vigente  ")).status).toBe("SUSPENDED");
    expect(updateStatus).toHaveBeenCalledWith("e1", "SUSPENDED", "Alerta climática vigente", status);
    expect(countByEventId).not.toHaveBeenCalled();
  });
  it.each([undefined, " ", 42, "x".repeat(501)])("rechaza motivo inválido %p", async reason => {
    const { useCase, updateStatus } = setup();
    await expect(useCase.execute("e1", "suspend", reason)).rejects.toThrow();
    expect(updateStatus).not.toHaveBeenCalled();
  });
  it.each([[2, "ACTIVE"], [3, "ACTIVE_FULL"], [4, "ACTIVE_FULL"]] as const)("reanuda con %s inscriptos como %s", async (count, status) => {
    const { useCase, updateStatus } = setup("SUSPENDED", count);
    await useCase.execute("e1", "resume");
    expect(updateStatus).toHaveBeenCalledWith("e1", status, null, "SUSPENDED");
  });
  it("reanuda un evento de acceso libre sin marcarlo completo", async () => {
    const { useCase, updateStatus } = setup("SUSPENDED", 5, { requiresRegistration: false });
    await useCase.execute("e1", "resume");
    expect(updateStatus).toHaveBeenCalledWith("e1", "ACTIVE", null, "SUSPENDED");
  });
  it.each(["suspend", "resume"] as const)("no permite %s un evento cancelado", async action => {
    const { useCase, updateStatus } = setup("CANCELLED");
    await expect(useCase.execute("e1", action, "Clima")).rejects.toThrow("cancelado");
    expect(updateStatus).not.toHaveBeenCalled();
  });
  it.each(["suspend", "resume"] as const)("no permite %s un evento terminado", async action => {
    const { useCase, updateStatus } = setup("SUSPENDED", 2, { endDate: new Date(Date.now() - 1) });
    await expect(useCase.execute("e1", action, "Clima")).rejects.toThrow("terminó");
    expect(updateStatus).not.toHaveBeenCalled();
  });
  it("no reanuda activos ni repite suspensiones", async () => {
    await expect(setup().useCase.execute("e1", "resume")).rejects.toThrow("Solo se puede");
    await expect(setup("SUSPENDED").useCase.execute("e1", "suspend", "Clima")).rejects.toThrow("ya está");
  });
  it("rechaza eventos inexistentes", async () => {
    const { useCase, findById } = setup();
    findById.mockResolvedValue(null);
    await expect(useCase.execute("e1", "suspend", "Clima")).rejects.toThrow("no existe");
  });
});
