import { definitions } from "../../scripts/register-event-types";
import { ReservationLifecyclePublisher } from "../../src/application/events/ReservationLifecyclePublisher";
import { RequestReservationUseCase } from "../../src/application/use-cases/RequestReservationUseCase";
import { DomainEvent } from "../../src/domain/entities/DomainEvent";
import { PublicSpace } from "../../src/domain/entities/PublicSpace";
import { RequestReservationData, Reservation } from "../../src/domain/entities/Reservation";
import { ReservationController } from "../../src/interfaces/http/controllers/ReservationController";
import { logger } from "../../src/shared/logging/logger";
import { avroErrors } from "../helpers/avroValidate";

const ACTIVITY_CREATED = "com.citypass.espacios.ActividadCreada";
const START = new Date(Date.now() + 7 * 24 * 3600_000);
START.setUTCHours(15, 0, 0, 0);
const END = new Date(START);
END.setUTCHours(18, 0, 0, 0);

const located: PublicSpace = {
  id: "space-1", name: "Plaza Houssay", description: "Plaza", address: "Av. Córdoba 2100", capacity: 500,
  status: "ENABLED", zone: "Recoleta", exposure: "OUTDOOR", category: "PLAZA",
  latitude: -34.5994, longitude: -58.3988, createdAt: new Date()
};

function setup(space: PublicSpace = located, options: { failActivityBus?: boolean } = {}) {
  const saved: DomainEvent[] = [];
  const published: DomainEvent[] = [];
  const outbox = { save: jest.fn(async (event: DomainEvent) => { saved.push(event); }) };
  const bus = {
    publish: jest.fn(async (event: DomainEvent) => {
      if (options.failActivityBus && event.name === ACTIVITY_CREATED) throw new Error("gateway caido");
      published.push(event);
    })
  };
  const reservations = {
    findOverlapping: jest.fn().mockResolvedValue([]),
    create: jest.fn(async (data: RequestReservationData): Promise<Reservation> => ({
      id: "res-1", ...data, status: "CONFIRMED", createdAt: new Date()
    }))
  };
  const useCase = new RequestReservationUseCase(
    { findById: jest.fn().mockResolvedValue(space) } as never,
    reservations as never,
    { findOverlapping: jest.fn().mockResolvedValue([]) } as never,
    outbox,
    bus,
    { generate: jest.fn().mockResolvedValue("qr") } as never,
    { send: jest.fn() } as never,
    undefined,
    new ReservationLifecyclePublisher(outbox, bus)
  );
  return { useCase, saved, published };
}

const input = {
  publicSpaceId: "space-1",
  requesterName: "Ana Perez",
  requesterEmail: "ana.perez@test.com",
  estimatedAttendees: 80,
  startDate: START.toISOString(),
  endDate: END.toISOString(),
  actorSub: "sub-ciudadano-1"
};

describe("ActividadCreada al reservar un espacio", () => {
  afterEach(() => jest.restoreAllMocks());

  it("publica ActividadCreada despues de los eventos de reserva, con el payload v3", async () => {
    const { useCase, saved, published } = setup();

    const reservation = await useCase.execute(input);

    expect(published.map(event => event.name)).toEqual([
      "com.citypass.espacios.ReservaConfirmada",
      "com.citypass.espacios.ReservaCreada",
      "com.citypass.espacios.ReservaActualizada",
      ACTIVITY_CREATED
    ]);
    expect(saved).toEqual(published);
    const activity = published[3];
    expect(activity.payload).toEqual({
      correlationId: `act-${reservation.id}`,
      actividadId: reservation.id,
      titulo: "Reserva de Plaza Houssay",
      estado: "PROGRAMADA",
      capacidad: 80,
      fechaHoraInicio: START.getTime(),
      fechaHoraFinalizacion: END.getTime(),
      ubicacion: { lat: -34.5994, lng: -58.3988 },
      direccion: "Av. Córdoba 2100",
      espacioNombre: "Plaza Houssay",
      actorSub: "sub-ciudadano-1",
      categoria: null,
      organizadorTipo: "CIUDADANO"
    });
    // actividadId = reservaId: se cruza con ReservaCreada y no se cuenta dos veces.
    expect(activity.payload.actividadId).toBe(published[1].payload.reservaId);
    expect(typeof activity.payload.fechaHoraInicio).toBe("number");
    expect(avroErrors(definitions.find(item => item.name === "ActividadCreada"), activity.payload)).toEqual([]);
  });

  it("no lleva datos personales del solicitante", async () => {
    const { useCase, published } = setup();

    await useCase.execute(input);

    const serialized = JSON.stringify(published.find(event => event.name === ACTIVITY_CREATED)!.payload);
    expect(serialized).not.toContain("Ana Perez");
    expect(serialized).not.toContain("ana.perez@test.com");
    expect(serialized).not.toMatch(/requester/i);
  });

  it("sin sub autenticado manda actorSub null", async () => {
    const { useCase, published } = setup();

    await useCase.execute({ ...input, actorSub: undefined });

    expect(published.find(event => event.name === ACTIVITY_CREATED)!.payload.actorSub).toBeNull();
  });

  it("un espacio sin coordenadas no publica ActividadCreada, pero si los eventos de reserva", async () => {
    const warn = jest.spyOn(logger, "warn").mockImplementation(() => undefined);
    const { useCase, saved, published } = setup({ ...located, latitude: null, longitude: null });

    const reservation = await useCase.execute(input);

    expect(reservation.status).toBe("CONFIRMED");
    expect(published.map(event => event.name)).toEqual([
      "com.citypass.espacios.ReservaConfirmada",
      "com.citypass.espacios.ReservaCreada",
      "com.citypass.espacios.ReservaActualizada"
    ]);
    expect(saved.map(event => event.name)).not.toContain(ACTIVITY_CREATED);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ reservaId: "res-1", espacioId: "space-1", eventName: ACTIVITY_CREATED }),
      expect.stringContaining("no tiene coordenadas")
    );
  });

  it("si falla la publicacion de ActividadCreada, la reserva sale igual y el evento queda en el outbox", async () => {
    jest.spyOn(logger, "warn").mockImplementation(() => undefined);
    const { useCase, saved, published } = setup(located, { failActivityBus: true });

    const reservation = await useCase.execute(input);

    expect(reservation.id).toBe("res-1");
    expect(saved.map(event => event.name)).toContain(ACTIVITY_CREATED);
    expect(published.map(event => event.name)).not.toContain(ACTIVITY_CREATED);
  });
});

describe("ReservationController.create", () => {
  it("pasa el sub del usuario autenticado y no el que venga en el body", async () => {
    const execute = jest.fn().mockResolvedValue({ id: "res-1" });
    const controller = new ReservationController({ execute } as never, {} as never, {} as never);
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.create(
      { body: { publicSpaceId: "space-1", actorSub: "sub-falso" }, user: { id: "sub-real", name: "Ana", email: "a@b.c" } } as never,
      response as never
    );

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ actorSub: "sub-real" }));
  });
});
