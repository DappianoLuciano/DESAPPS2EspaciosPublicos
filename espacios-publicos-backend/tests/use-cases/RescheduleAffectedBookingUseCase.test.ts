import { RescheduleAffectedBookingUseCase } from "../../src/application/use-cases/RescheduleAffectedBookingUseCase";
import { DomainEvent } from "../../src/domain/entities/DomainEvent";
import { EmergencyImpactRecord } from "../../src/domain/entities/EmergencyImpact";

const start = new Date(Date.now() + 86_400_000).toISOString();
const end = new Date(Date.now() + 90_000_000).toISOString();

function impact(overrides: Partial<EmergencyImpactRecord> = {}): EmergencyImpactRecord {
  return {
    id: "imp-1",
    emergenciaId: "EMG-1",
    bookingType: "RESERVATION",
    bookingId: "res-1",
    publicSpaceId: "plaza",
    bookingLabel: "Reserva en Plaza",
    startDate: new Date(),
    endDate: new Date(),
    status: "A_REPROGRAMAR",
    organizerName: "Org",
    organizerEmail: null,
    rescheduledBy: null,
    rescheduledAt: null,
    releasedAt: null,
    createdAt: new Date(),
    ...overrides
  };
}

function setup(current: EmergencyImpactRecord | null, overlapping: Array<{ id: string; estimatedAttendees: number }> = []) {
  const impacts = {
    findImpactById: jest.fn().mockResolvedValue(current),
    rescheduleBooking: jest.fn().mockResolvedValue({ ...current, status: "REPROGRAMADA" })
  };
  const eventBus = { publish: jest.fn().mockResolvedValue(undefined) };
  const emailSender = { send: jest.fn().mockResolvedValue(undefined) };
  const useCase = new RescheduleAffectedBookingUseCase(
    impacts,
    { findById: jest.fn().mockResolvedValue({ capacity: 20 }) } as never,
    {
      findById: jest.fn().mockResolvedValue({ id: "res-1", estimatedAttendees: 10 }),
      findOverlapping: jest.fn().mockResolvedValue(overlapping)
    } as never,
    { findById: jest.fn(), findOverlapping: jest.fn().mockResolvedValue([]) } as never,
    { countByEventId: jest.fn(), findByEventId: jest.fn().mockResolvedValue([]) },
    eventBus,
    { save: jest.fn() },
    emailSender
  );

  return { useCase, impacts, eventBus, emailSender };
}

const input = { impactId: "imp-1", startDate: start, endDate: end, actor: "operador" };

describe("RescheduleAffectedBookingUseCase", () => {
  it("reprograma, audita al operador y publica ReservaAfectada", async () => {
    const { useCase, impacts, eventBus } = setup(impact());

    await useCase.execute(input);

    expect(impacts.rescheduleBooking.mock.calls[0][0].actor).toBe("operador");
    const event = eventBus.publish.mock.calls[0][0] as DomainEvent;
    expect(event.payload).toMatchObject({ accion: "REPROGRAMADA", horario: { inicio: start, fin: end } });
  });

  it("no cuenta a la propia reserva como solapamiento", async () => {
    const { useCase } = setup(impact(), [{ id: "res-1", estimatedAttendees: 10 }]);

    await expect(useCase.execute(input)).resolves.toBeDefined();
  });

  it("avisa la fecha en horario argentino y sin formato tecnico", async () => {
    const { useCase, impacts, emailSender } = setup(impact({ organizerEmail: "org@test.com" }));
    impacts.rescheduleBooking.mockResolvedValue(impact({ organizerEmail: "org@test.com" }));

    await useCase.execute({ ...input, startDate: "2030-03-10T21:30:00.000Z", endDate: "2030-03-10T23:00:00.000Z" });

    const html = emailSender.send.mock.calls[0][2] as string;
    expect(html).toContain("18:30");
    expect(html).not.toContain("2030-03-10T");
  });

  it("rechaza si no hay cupo", async () => {
    const { useCase, impacts } = setup(impact(), [{ id: "otra", estimatedAttendees: 15 }]);

    await expect(useCase.execute(input)).rejects.toThrow("cupo");
    expect(impacts.rescheduleBooking).not.toHaveBeenCalled();
  });

  it("rechaza una fecha pasada", async () => {
    const { useCase } = setup(impact());

    await expect(useCase.execute({ ...input, startDate: "2020-01-01T00:00:00Z" })).rejects.toThrow("pasada");
  });

  it("rechaza una reserva ya confirmada", async () => {
    const { useCase } = setup(impact({ status: "CONFIRMADA" }));

    await expect(useCase.execute(input)).rejects.toThrow("confirmada");
  });
});
