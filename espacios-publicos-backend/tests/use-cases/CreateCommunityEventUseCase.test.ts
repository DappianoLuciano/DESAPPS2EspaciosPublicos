import { CreateCommunityEventUseCase } from "../../src/application/use-cases/CreateCommunityEventUseCase";
import {
  CommunityEvent,
  CommunityEventStatus,
  CreateCommunityEventData
} from "../../src/domain/entities/CommunityEvent";
import { CommunityEventCatalogItem } from "../../src/domain/entities/CommunityEventCatalogItem";
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

  async create(data: CreateCommunityEventData): Promise<CommunityEvent> {
    const communityEvent: CommunityEvent = {
      id: `event-${this.events.length + 1}`,
      title: data.title,
      category: data.category,
      description: data.description,
      publicSpaceId: data.publicSpaceId,
      organizerName: data.organizerName,
      capacity: data.capacity,
      requiresRegistration: data.requiresRegistration,
      startDate: data.startDate,
      endDate: data.endDate,
      status: "ACTIVE",
      imageUrl: data.imageUrl,
      createdAt: new Date()
    };

    this.events.push(communityEvent);
    return communityEvent;
  }

  async findAll(): Promise<CommunityEvent[]> {
    return this.events;
  }

  async findActiveCatalog(): Promise<CommunityEventCatalogItem[]> {
    return [];
  }

  async findById(id: string): Promise<CommunityEvent | null> {
    return this.events.find((event) => event.id === id) || null;
  }

  async findOverlapping(publicSpaceId: string, startDate: Date, endDate: Date): Promise<CommunityEvent[]> {
    return this.events.filter((event) => {
      const sameSpace = event.publicSpaceId === publicSpaceId;
      const activeStatus = event.status === "ACTIVE" || event.status === "ACTIVE_FULL";
      const overlaps = event.startDate < endDate && event.endDate > startDate;

      return sameSpace && activeStatus && overlaps;
    });
  }

  async updateStatus(id: string, status: CommunityEventStatus): Promise<CommunityEvent> {
    const event = await this.findById(id);

    if (!event) {
      throw new Error("Evento no encontrado.");
    }

    event.status = status;
    return event;
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

  const useCase = new CreateCommunityEventUseCase(
    publicSpaceRepository,
    reservationRepository,
    communityEventRepository,
    eventOutboxRepository,
    eventBus
  );

  return {
    useCase,
    reservationRepository,
    communityEventRepository,
    eventOutboxRepository,
    eventBus
  };
}

const validInput = {
  title: "Feria de emprendedores",
  category: "Cultura",
  description: "Encuentro comunitario con puestos culturales y talleres.",
  publicSpaceId: "space-1",
  organizerName: "Comuna 6",
  organizerProfileEnabled: true,
  capacity: 300,
  requiresRegistration: true,
  startDate: "2026-09-15T13:00:00.000Z",
  endDate: "2026-09-15T20:00:00.000Z",
  imageUrl: "https://example.com/feria.jpg"
};

describe("CreateCommunityEventUseCase", () => {
  it("publica un evento activo y registra el evento de dominio", async () => {
    const { useCase, eventOutboxRepository, eventBus } = createUseCase();

    const communityEvent = await useCase.execute(validInput);

    expect(communityEvent.status).toBe("ACTIVE");
    expect(communityEvent.requiresRegistration).toBe(true);
    expect(eventOutboxRepository.events).toHaveLength(1);
    expect(eventBus.events).toHaveLength(1);
    expect(eventBus.events[0].name).toBe("cultura.evento_comunitario_publicado");
  });

  it("permite publicar un evento de libre acceso cuando no requiere inscripcion previa", async () => {
    const { useCase } = createUseCase();

    const communityEvent = await useCase.execute({
      ...validInput,
      requiresRegistration: false
    });

    expect(communityEvent.status).toBe("ACTIVE");
    expect(communityEvent.requiresRegistration).toBe(false);
  });

  it("rechaza la publicacion si el espacio tiene una reserva confirmada en ese horario", async () => {
    const { useCase, reservationRepository } = createUseCase();

    await reservationRepository.create({
      publicSpaceId: "space-1",
      requesterName: "Centro barrial",
      requesterEmail: "centro@test.com",
      estimatedAttendees: 80,
      startDate: new Date("2026-09-15T14:00:00.000Z"),
      endDate: new Date("2026-09-15T16:00:00.000Z")
    });

    await expect(useCase.execute(validInput)).rejects.toThrow(
      "El espacio tiene reservas confirmadas en ese horario."
    );
  });

  it("rechaza la publicacion si el organizador no tiene perfil habilitado", async () => {
    const { useCase } = createUseCase();

    await expect(
      useCase.execute({
        ...validInput,
        organizerProfileEnabled: false
      })
    ).rejects.toThrow("El organizador no cuenta con perfil habilitado para publicar eventos.");
  });

  it("rechaza la publicacion si falta un dato obligatorio", async () => {
    const { useCase } = createUseCase();

    await expect(
      useCase.execute({
        ...validInput,
        title: ""
      })
    ).rejects.toThrow("Titulo, descripcion y espacio publico son obligatorios.");
  });
});
