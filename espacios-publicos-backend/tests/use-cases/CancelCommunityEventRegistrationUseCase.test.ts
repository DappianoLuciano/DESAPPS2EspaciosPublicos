import { CancelCommunityEventRegistrationUseCase } from "../../src/application/use-cases/CancelCommunityEventRegistrationUseCase";
import { CommunityEvent, CommunityEventStatus } from "../../src/domain/entities/CommunityEvent";
import { DomainEvent } from "../../src/domain/entities/DomainEvent";
import { CommunityEventRegistrationRepository } from "../../src/domain/repositories/CommunityEventRegistrationRepository";
import { CommunityEventRepository } from "../../src/domain/repositories/CommunityEventRepository";
import { ForbiddenError } from "../../src/shared/errors/ForbiddenError";

const PUBLISHED = "com.citypass.espacios.EventoComunitarioPublicado";
const EVENT_START = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const EVENT_END = new Date(EVENT_START.getTime() + 3 * 60 * 60 * 1000);

const SPACE = {
  id: "space-1",
  name: "Plaza",
  description: "d",
  address: "Av. Siempreviva 742",
  zone: "Mataderos",
  capacity: 100,
  latitude: -34.65,
  longitude: -58.5,
  status: "ENABLED" as const,
  createdAt: new Date()
};

function setup(status: CommunityEventStatus = "ACTIVE", remainingAfterDelete = 1) {
  const communityEvent: CommunityEvent = {
    id: "event-1",
    title: "Feria",
    category: "Cultura",
    tags: [],
    description: "d",
    requirements: [],
    publicSpaceId: "space-1",
    organizerName: "Comuna 9",
    capacity: 2,
    requiresRegistration: true,
    startDate: EVENT_START,
    endDate: EVENT_END,
    status,
    createdAt: new Date()
  };
  const registration = {
    id: "registration-1",
    communityEventId: "event-1",
    citizenEmail: "propietario@example.com",
    communityEvent: { status }
  };

  const deleteById = jest.fn().mockResolvedValue(undefined);
  const updateStatus = jest.fn(async (_id: string, next: CommunityEventStatus) => {
    communityEvent.status = next;
    return communityEvent;
  });
  const outbox: DomainEvent[] = [];
  const bus: DomainEvent[] = [];

  const useCase = new CancelCommunityEventRegistrationUseCase(
    {
      findById: jest.fn(async () => ({ ...communityEvent })),
      updateStatus
    } as unknown as CommunityEventRepository,
    {
      findById: jest.fn().mockResolvedValue(registration),
      deleteById,
      countByEventId: jest.fn().mockResolvedValue(remainingAfterDelete)
    } as unknown as CommunityEventRegistrationRepository,
    { findById: async () => SPACE },
    { save: async (event: DomainEvent) => void outbox.push(event) },
    { publish: async (event: DomainEvent) => void bus.push(event) }
  );

  return { useCase, deleteById, updateStatus, outbox, bus };
}

describe("cancelacion de inscripciones propias", () => {
  it("rechaza la cancelacion solicitada por otro ciudadano", async () => {
    const { useCase, deleteById, bus, outbox } = setup();

    await expect(
      useCase.execute("registration-1", "otra-persona@example.com")
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(deleteById).not.toHaveBeenCalled();
    expect(bus).toHaveLength(0);
    expect(outbox).toHaveLength(0);
  });

  it("permite cancelar al propietario de la inscripcion", async () => {
    const { useCase, deleteById } = setup();

    await useCase.execute("registration-1", "PROPIETARIO@example.com");

    expect(deleteById).toHaveBeenCalledWith("registration-1");
  });

  it("al darse de baja republica el evento con el total actual de inscriptos", async () => {
    const { useCase, bus, outbox } = setup("ACTIVE", 3);

    await useCase.execute("registration-1", "propietario@example.com");

    expect(bus).toHaveLength(1);
    expect(outbox.map((event) => event.id)).toEqual(bus.map((event) => event.id));
    expect(bus[0].name).toBe(PUBLISHED);
    expect(bus[0].payload).toEqual({
      eventoId: "event-1",
      espacioId: "space-1",
      titulo: "Feria",
      zona: "Mataderos",
      direccion: "Av. Siempreviva 742",
      latitud: -34.65,
      longitud: -58.5,
      inicio: EVENT_START.toISOString(),
      fin: EVENT_END.toISOString(),
      capacidad: 2,
      cupoMaximo: 2,
      inscriptos: 3,
      estado: "ACTIVE",
      categoria: "Cultura",
      correlationId: "evento-event-1"
    });
  });

  it("si el evento estaba completo vuelve a ACTIVE y lo publica con ese estado", async () => {
    const { useCase, updateStatus, bus } = setup("ACTIVE_FULL", 1);

    await useCase.execute("registration-1", "propietario@example.com");

    expect(updateStatus).toHaveBeenCalledWith("event-1", "ACTIVE", undefined, "ACTIVE_FULL");
    expect(bus[0].payload).toEqual(expect.objectContaining({ estado: "ACTIVE", inscriptos: 1 }));
  });

  it("dar de baja una inscripción no reanuda un evento suspendido", async () => {
    const { useCase, deleteById, updateStatus } = setup("SUSPENDED", 0);

    await useCase.execute("registration-1", "propietario@example.com");

    expect(deleteById).toHaveBeenCalled();
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it("no republica un evento cancelado", async () => {
    const { useCase, deleteById, bus, outbox } = setup("CANCELLED", 0);

    await useCase.execute("registration-1", "propietario@example.com");

    expect(deleteById).toHaveBeenCalled();
    expect(bus).toHaveLength(0);
    expect(outbox).toHaveLength(0);
  });
});
