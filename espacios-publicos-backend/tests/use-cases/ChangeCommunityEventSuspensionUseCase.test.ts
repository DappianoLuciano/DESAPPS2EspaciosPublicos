import { ChangeCommunityEventSuspensionUseCase } from "../../src/application/use-cases/ChangeCommunityEventSuspensionUseCase";
import { CommunityEvent } from "../../src/domain/entities/CommunityEvent";

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
  const useCase = new ChangeCommunityEventSuspensionUseCase(
    { findById, updateStatus } as never, { countByEventId } as never
  );
  return { useCase, updateStatus, countByEventId, findById };
}

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
