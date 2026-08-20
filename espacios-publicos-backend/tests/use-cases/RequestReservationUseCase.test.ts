import { CommunityEvent, CreateCommunityEventData } from "../../src/domain/entities/CommunityEvent";
import { RequestReservationUseCase } from "../../src/application/use-cases/RequestReservationUseCase";
import { DomainEvent } from "../../src/domain/entities/DomainEvent";
import { PublicSpace } from "../../src/domain/entities/PublicSpace";
import { RequestReservationData, Reservation } from "../../src/domain/entities/Reservation";
import { CommunityEventRepository } from "../../src/domain/repositories/CommunityEventRepository";
import { EventOutboxRepository } from "../../src/domain/repositories/EventOutboxRepository";
import { PublicSpaceRepository } from "../../src/domain/repositories/PublicSpaceRepository";
import { ReservationRepository } from "../../src/domain/repositories/ReservationRepository";
import { EventBus } from "../../src/domain/services/EventBus";

class FakePublicSpaceRepository implements PublicSpaceRepository {
  public spaces: PublicSpace[] = [];

  async create(): Promise<PublicSpace> {
    throw new Error("Metodo no usado en esta prueba.");
  }

  async findById(id: string): Promise<PublicSpace | null> {
    return this.spaces.find((space) => space.id === id) || null;
  }

  async findAll(): Promise<PublicSpace[]> {
    return this.spaces;
  }
}

class FakeReservationRepository implements ReservationRepository {
  public reservations: Reservation[] = [];

  async create(data: RequestReservationData): Promise<Reservation> {
    const reservation: Reservation = {
      id: `reservation-${this.reservations.length + 1}`,
      publicSpaceId: data.publicSpaceId,
      requesterName: data.requesterName,
      requesterEmail: data.requesterEmail,
      estimatedAttendees: data.estimatedAttendees,
      startDate: data.startDate,
      endDate: data.endDate,
      status: "CONFIRMED",
      createdAt: new Date()
    };

    this.reservations.push(reservation);
    return reservation;
  }

  async findAll(): Promise<Reservation[]> {
    return this.reservations;
  }

  async findOverlapping(publicSpaceId: string, startDate: Date, endDate: Date): Promise<Reservation[]> {
    return this.reservations.filter((reservation) => {
      const sameSpace = reservation.publicSpaceId === publicSpaceId;
      const activeStatus = reservation.status === "CONFIRMED";
      const overlaps = reservation.startDate < endDate && reservation.endDate > startDate;

      return sameSpace && activeStatus && overlaps;
    });
  }
}

class FakeCommunityEventRepository implements CommunityEventRepository {
  public events: CommunityEvent[] = [];

  async create(_data: CreateCommunityEventData): Promise<CommunityEvent> {
    throw new Error("Metodo no usado en esta prueba.");
  }

  async findAll(): Promise<CommunityEvent[]> {
    return this.events;
  }

  async findOverlapping(publicSpaceId: string, startDate: Date, endDate: Date): Promise<CommunityEvent[]> {
    return this.events.filter((event) => {
      const sameSpace = event.publicSpaceId === publicSpaceId;
      const activeStatus = event.status === "ACTIVE" || event.status === "ACTIVE_FULL";
      const overlaps = event.startDate < endDate && event.endDate > startDate;

      return sameSpace && activeStatus && overlaps;
    });
  }
}

class FakeEventOutboxRepository implements EventOutboxRepository {
  public events: DomainEvent[] = [];

  async save(event: DomainEvent): Promise<void> {
    this.events.push(event);
  }
}

class FakeEventBus implements EventBus {
  public events: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.events.push(event);
  }
}

function createUseCase() {
  const publicSpaceRepository = new FakePublicSpaceRepository();
  const reservationRepository = new FakeReservationRepository();
  const communityEventRepository = new FakeCommunityEventRepository();
  const eventOutboxRepository = new FakeEventOutboxRepository();
  const eventBus = new FakeEventBus();

  publicSpaceRepository.spaces.push({
    id: "space-1",
    name: "Parque Centenario",
    description: "Espacio verde para actividades culturales.",
    address: "CABA",
    capacity: 500,
    createdAt: new Date()
  });

  const useCase = new RequestReservationUseCase(
    publicSpaceRepository,
    reservationRepository,
    communityEventRepository,
    eventOutboxRepository,
    eventBus
  );

  return { useCase, reservationRepository, communityEventRepository, eventOutboxRepository, eventBus };
}

describe("RequestReservationUseCase", () => {
  it("crea una reserva y publica el evento de dominio", async () => {
    const { useCase, eventOutboxRepository, eventBus } = createUseCase();

    const reservation = await useCase.execute({
      publicSpaceId: "space-1",
      requesterName: "Centro Cultural Barrial",
      requesterEmail: "contacto@centro.test",
      estimatedAttendees: 80,
      startDate: "2026-09-10T15:00:00.000Z",
      endDate: "2026-09-10T18:00:00.000Z"
    });

    expect(reservation.status).toBe("CONFIRMED");
    expect(eventOutboxRepository.events).toHaveLength(1);
    expect(eventBus.events).toHaveLength(1);
    expect(eventBus.events[0].name).toBe("espacios.reserva_confirmada");
  });

  it("rechaza una reserva cuando no queda cupo en la franja horaria", async () => {
    const { useCase } = createUseCase();

    await useCase.execute({
      publicSpaceId: "space-1",
      requesterName: "Primer solicitante",
      requesterEmail: "uno@test.com",
      estimatedAttendees: 450,
      startDate: "2026-09-10T15:00:00.000Z",
      endDate: "2026-09-10T18:00:00.000Z"
    });

    await expect(
      useCase.execute({
        publicSpaceId: "space-1",
        requesterName: "Segundo solicitante",
        requesterEmail: "dos@test.com",
        estimatedAttendees: 100,
        startDate: "2026-09-10T17:00:00.000Z",
        endDate: "2026-09-10T20:00:00.000Z"
      })
    ).rejects.toThrow("El espacio no tiene cupo disponible para ese rango horario.");
  });
});
