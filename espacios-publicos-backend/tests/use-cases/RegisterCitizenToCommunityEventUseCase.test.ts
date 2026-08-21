import { RegisterCitizenToCommunityEventUseCase } from "../../src/application/use-cases/RegisterCitizenToCommunityEventUseCase";
import { CommunityEvent, CommunityEventStatus, CreateCommunityEventData } from "../../src/domain/entities/CommunityEvent";
import { CommunityEventCatalogItem } from "../../src/domain/entities/CommunityEventCatalogItem";
import {
  CommunityEventRegistration,
  CreateCommunityEventRegistrationData
} from "../../src/domain/entities/CommunityEventRegistration";
import { DomainEvent } from "../../src/domain/entities/DomainEvent";
import { CommunityEventRegistrationRepository } from "../../src/domain/repositories/CommunityEventRegistrationRepository";
import { CommunityEventRepository } from "../../src/domain/repositories/CommunityEventRepository";
import { EventOutboxRepository } from "../../src/domain/repositories/EventOutboxRepository";
import { EventBus } from "../../src/domain/services/EventBus";

class FakeCommunityEventRepository implements CommunityEventRepository {
  public events: CommunityEvent[] = [];

  async create(_data: CreateCommunityEventData): Promise<CommunityEvent> {
    throw new Error("Metodo no usado en esta prueba.");
  }

  async findById(id: string): Promise<CommunityEvent | null> {
    return this.events.find((event) => event.id === id) || null;
  }

  async findAll(): Promise<CommunityEvent[]> {
    return this.events;
  }

  async findActiveCatalog(): Promise<CommunityEventCatalogItem[]> {
    return [];
  }

  async findOverlapping(): Promise<CommunityEvent[]> {
    return [];
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

class FakeCommunityEventRegistrationRepository implements CommunityEventRegistrationRepository {
  public registrations: CommunityEventRegistration[] = [];

  async create(data: CreateCommunityEventRegistrationData): Promise<CommunityEventRegistration> {
    const registration: CommunityEventRegistration = {
      id: `registration-${this.registrations.length + 1}`,
      communityEventId: data.communityEventId,
      citizenName: data.citizenName,
      citizenEmail: data.citizenEmail,
      createdAt: new Date()
    };

    this.registrations.push(registration);
    return registration;
  }

  async countByEventId(communityEventId: string): Promise<number> {
    return this.registrations.filter((registration) => {
      return registration.communityEventId === communityEventId;
    }).length;
  }

  async findByEventAndCitizenEmail(
    communityEventId: string,
    citizenEmail: string
  ): Promise<CommunityEventRegistration | null> {
    return (
      this.registrations.find((registration) => {
        return (
          registration.communityEventId === communityEventId &&
          registration.citizenEmail === citizenEmail
        );
      }) || null
    );
  }

  async findByEventId(communityEventId: string): Promise<CommunityEventRegistration[]> {
    return this.registrations.filter((registration) => {
      return registration.communityEventId === communityEventId;
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

function createUseCase(capacity = 2, requiresRegistration = true) {
  const communityEventRepository = new FakeCommunityEventRepository();
  const communityEventRegistrationRepository = new FakeCommunityEventRegistrationRepository();
  const eventOutboxRepository = new FakeEventOutboxRepository();
  const eventBus = new FakeEventBus();

  communityEventRepository.events.push({
    id: "event-1",
    title: "Feria de emprendedores",
    category: "Cultura",
    description: "Encuentro comunitario.",
    publicSpaceId: "space-1",
    organizerName: "Comuna 6",
    capacity,
    requiresRegistration,
    startDate: new Date("2026-09-15T13:00:00.000Z"),
    endDate: new Date("2026-09-15T20:00:00.000Z"),
    status: "ACTIVE",
    createdAt: new Date()
  });

  const useCase = new RegisterCitizenToCommunityEventUseCase(
    communityEventRepository,
    communityEventRegistrationRepository,
    eventOutboxRepository,
    eventBus
  );

  return {
    useCase,
    communityEventRepository,
    communityEventRegistrationRepository,
    eventOutboxRepository,
    eventBus
  };
}

describe("RegisterCitizenToCommunityEventUseCase", () => {
  it("inscribe un ciudadano y publica evento de dominio", async () => {
    const { useCase, eventBus, eventOutboxRepository } = createUseCase();

    const registration = await useCase.execute({
      communityEventId: "event-1",
      citizenName: "Ana Gomez",
      citizenEmail: "ana@test.com"
    });

    expect(registration.id).toBe("registration-1");
    expect(eventOutboxRepository.events).toHaveLength(1);
    expect(eventBus.events[0].name).toBe("cultura.ciudadano_inscripto");
  });

  it("rechaza inscripciones duplicadas al mismo evento", async () => {
    const { useCase } = createUseCase();

    await useCase.execute({
      communityEventId: "event-1",
      citizenName: "Ana Gomez",
      citizenEmail: "ana@test.com"
    });

    await expect(
      useCase.execute({
        communityEventId: "event-1",
        citizenName: "Ana Gomez",
        citizenEmail: "ana@test.com"
      })
    ).rejects.toThrow("El ciudadano ya se encuentra inscripto a este evento.");
  });

  it("rechaza inscripciones cuando el evento es de libre acceso", async () => {
    const { useCase } = createUseCase(2, false);

    await expect(
      useCase.execute({
        communityEventId: "event-1",
        citizenName: "Ana Gomez",
        citizenEmail: "ana@test.com"
      })
    ).rejects.toThrow("El evento es de libre acceso y no requiere inscripcion previa.");
  });

  it("marca el evento como completo cuando se ocupa el ultimo cupo", async () => {
    const { useCase, communityEventRepository } = createUseCase(1);

    await useCase.execute({
      communityEventId: "event-1",
      citizenName: "Ana Gomez",
      citizenEmail: "ana@test.com"
    });

    const communityEvent = await communityEventRepository.findById("event-1");
    expect(communityEvent?.status).toBe("ACTIVE_FULL");
  });
});
