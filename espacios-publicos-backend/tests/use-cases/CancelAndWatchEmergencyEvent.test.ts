import { CancelAffectedEventUseCase } from "../../src/application/use-cases/CancelAffectedEventUseCase";
import { WatchEmergencyEventUseCase } from "../../src/application/use-cases/WatchEmergencyEventUseCase";
import { EmergencyImpactRecord } from "../../src/domain/entities/EmergencyImpact";

function impact(overrides: Partial<EmergencyImpactRecord> = {}): EmergencyImpactRecord {
  return {
    id: "imp-1",
    emergenciaId: "EMG-1",
    bookingType: "COMMUNITY_EVENT",
    bookingId: "evento-1",
    publicSpaceId: "plaza",
    bookingLabel: "Festival, Plaza",
    startDate: new Date(Date.now() - 3_600_000),
    endDate: new Date(Date.now() + 3_600_000),
    status: "EN_CURSO",
    organizerName: "Cultura",
    organizerEmail: "org@test.com",
    rescheduledBy: null,
    rescheduledAt: null,
    releasedAt: null,
    createdAt: new Date(),
    ...overrides
  };
}

function setupCancel(current: EmergencyImpactRecord | null) {
  const impacts = {
    findImpactById: jest.fn().mockResolvedValue(current),
    cancelImpact: jest.fn().mockResolvedValue(current && { ...current, status: "CANCELADA" })
  };
  const cancelCommunityEvent = { execute: jest.fn().mockResolvedValue({}) };
  const emailSender = { send: jest.fn().mockResolvedValue(undefined) };
  const attendees = { findByEventId: jest.fn().mockResolvedValue([{ citizenName: "Ana", citizenEmail: "ana@test.com" }]) };
  const watchers = {
    listPendingWatchers: jest.fn().mockResolvedValue([{ id: "w1", eventId: "evento-1", email: "caro@test.com", name: "Caro" }]),
    markWatchersNotified: jest.fn().mockResolvedValue(undefined)
  };
  const useCase = new CancelAffectedEventUseCase(impacts, cancelCommunityEvent, emailSender, attendees, watchers);

  return { useCase, impacts, cancelCommunityEvent, emailSender, watchers };
}

describe("CancelAffectedEventUseCase", () => {
  it("cancela con la cancelacion de siempre y avisa a organizador, inscriptos e interesados", async () => {
    const { useCase, impacts, cancelCommunityEvent, emailSender, watchers } = setupCancel(impact());

    const result = await useCase.execute({ impactId: "imp-1", reason: "Corte de calle", actorSub: "admin-1" });

    expect(result.status).toBe("CANCELADA");
    expect(cancelCommunityEvent.execute).toHaveBeenCalledWith("evento-1", "Corte de calle", { actorSub: "admin-1" });
    expect(impacts.cancelImpact.mock.calls[0][0]).toBe("imp-1");
    expect(emailSender.send.mock.calls.map(([to]) => to)).toEqual(["org@test.com", "ana@test.com", "caro@test.com"]);
    expect(emailSender.send.mock.calls[1][2]).toContain("Corte de calle");
    expect(watchers.markWatchersNotified.mock.calls[0][0]).toEqual(["w1"]);
  });

  it("sin motivo usa uno por defecto", async () => {
    const { useCase, cancelCommunityEvent } = setupCancel(impact({ status: "SUSPENDIDA" }));

    await useCase.execute({ impactId: "imp-1" });

    expect(cancelCommunityEvent.execute.mock.calls[0][1]).toBe("Cancelado por una emergencia cercana.");
  });

  it("no cancela una reserva de espacio", async () => {
    const { useCase, cancelCommunityEvent } = setupCancel(impact({ bookingType: "RESERVATION" }));

    await expect(useCase.execute({ impactId: "imp-1" })).rejects.toThrow("Las reservas de espacio");
    expect(cancelCommunityEvent.execute).not.toHaveBeenCalled();
  });

  it("no cancela lo ya confirmado ni dos veces", async () => {
    await expect(setupCancel(impact({ status: "CONFIRMADA" })).useCase.execute({ impactId: "imp-1" }))
      .rejects.toThrow("quedó confirmado");
    await expect(setupCancel(impact({ status: "CANCELADA" })).useCase.execute({ impactId: "imp-1" }))
      .rejects.toThrow("ya fue cancelado");
  });

  it("si la cancelacion falla no marca la afectacion ni avisa", async () => {
    const { useCase, impacts, cancelCommunityEvent, emailSender } = setupCancel(impact());
    cancelCommunityEvent.execute.mockRejectedValue(new Error("El evento ya termino y no puede cancelarse."));

    await expect(useCase.execute({ impactId: "imp-1" })).rejects.toThrow("ya termino");
    expect(impacts.cancelImpact).not.toHaveBeenCalled();
    expect(emailSender.send).not.toHaveBeenCalled();
  });
});

describe("WatchEmergencyEventUseCase", () => {
  function setupWatch(onHold: boolean) {
    const impacts = {
      isEventOnHold: jest.fn().mockResolvedValue(onHold),
      addWatcher: jest.fn().mockResolvedValue(undefined),
      isWatching: jest.fn().mockResolvedValue(true)
    };
    return { useCase: new WatchEmergencyEventUseCase(impacts), impacts };
  }

  it("anota al ciudadano con su mail normalizado", async () => {
    const { useCase, impacts } = setupWatch(true);

    await expect(useCase.watch({ eventId: "evento-1", email: " Caro@Test.com ", name: "Caro" }))
      .resolves.toEqual({ watching: true });
    expect(impacts.addWatcher).toHaveBeenCalledWith("evento-1", "caro@test.com", "Caro");
  });

  it("no anota si el evento no esta pausado por una emergencia", async () => {
    const { useCase, impacts } = setupWatch(false);

    await expect(useCase.watch({ eventId: "evento-1", email: "caro@test.com", name: "Caro" }))
      .rejects.toThrow("no está pausado");
    expect(impacts.addWatcher).not.toHaveBeenCalled();
  });

  it("sin mail valido no anota", async () => {
    const { useCase } = setupWatch(true);

    await expect(useCase.watch({ eventId: "evento-1", email: "ciudadano", name: "" })).rejects.toThrow("mail válido");
  });
});
