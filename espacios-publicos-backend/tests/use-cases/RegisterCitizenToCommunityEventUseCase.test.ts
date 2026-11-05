import { RegisterCitizenToCommunityEventUseCase } from "../../src/application/use-cases/RegisterCitizenToCommunityEventUseCase";
import { CommunityEvent, CommunityEventStatus, CreateCommunityEventData } from "../../src/domain/entities/CommunityEvent";
import { CommunityEventCatalogItem } from "../../src/domain/entities/CommunityEventCatalogItem";
import {
  CitizenCommunityEventRegistration,
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

  async findActiveCatalogById(): Promise<CommunityEventCatalogItem | null> {
    return null;
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

  async findById(_id: string): Promise<CitizenCommunityEventRegistration | null> {
    return null;
  }

  async findByCitizenEmail(_citizenEmail: string): Promise<CitizenCommunityEventRegistration[]> {
    return [];
  }

  async deleteById(_id: string): Promise<void> {}
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

class FakeEmailSender {
  public emails: any[] = [];
  async send(to: string, subject: string, html: string): Promise<void> {
    this.emails.push({ to, subject, html });
  }
}

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

const PUBLISHED = "com.citypass.espacios.EventoComunitarioPublicado";

class FakeQrGenerator {
  async generate(_data: string): Promise<string> {
    return "fake-qr-data-uri";
  }
}

// Siempre en el futuro respecto a "ahora", para que estos tests no queden
// obsoletos con el correr del tiempo (ver #incidente CI: fechas fijas vencidas).
const EVENT_START = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
EVENT_START.setUTCHours(13, 0, 0, 0);
const EVENT_END = new Date(EVENT_START);
EVENT_END.setUTCHours(20, 0, 0, 0);

function createUseCase(capacity = 2, requiresRegistration = true) {
  const communityEventRepository = new FakeCommunityEventRepository();
  const communityEventRegistrationRepository = new FakeCommunityEventRegistrationRepository();
  const eventOutboxRepository = new FakeEventOutboxRepository();
  const eventBus = new FakeEventBus();
  const emailSender = new FakeEmailSender();

  communityEventRepository.events.push({
    id: "event-1",
    title: "Feria de emprendedores",
    category: "Cultura",
    tags: ["Emprendimientos"],
    description: "Encuentro comunitario.",
    requirements: [],
    publicSpaceId: "space-1",
    organizerName: "Comuna 6",
    capacity,
    requiresRegistration,
    startDate: EVENT_START,
    endDate: EVENT_END,
    status: "ACTIVE",
    createdAt: new Date()
  });

  const useCase = new RegisterCitizenToCommunityEventUseCase(
    communityEventRepository,
    communityEventRegistrationRepository,
    eventOutboxRepository,
    eventBus,
    new FakeQrGenerator(),
    emailSender,
    { findById: async (id: string) => (id === SPACE.id ? SPACE : null) }
  );

  return {
    useCase,
    communityEventRepository,
    communityEventRegistrationRepository,
    eventOutboxRepository,
    eventBus,
    emailSender
  };
}

describe("RegisterCitizenToCommunityEventUseCase", () => {
  it.each(["SUSPENDED", "CANCELLED"] as const)("bloquea inscripción directa cuando el evento está %s", async status => {
    const { useCase, communityEventRepository, communityEventRegistrationRepository, eventBus } = createUseCase();
    communityEventRepository.events[0].status = status;
    await expect(useCase.execute({ communityEventId: "event-1", citizenName: "Ana", citizenEmail: "ana@test.com" }))
      .rejects.toThrow("no esta abierto");
    expect(communityEventRegistrationRepository.registrations).toHaveLength(0);
    expect(eventBus.events).toHaveLength(0);
  });
  it("inscribe un ciudadano y publica evento de dominio", async () => {
    const { useCase, eventBus, eventOutboxRepository, emailSender } = createUseCase();

    const registration = await useCase.execute({
      communityEventId: "event-1",
      citizenName: "Ana Gomez",
      citizenEmail: "ana@test.com"
    });

    expect(registration.id).toBe("registration-1");
    // ReservaConfirmada + la republicacion de EventoComunitarioPublicado.
    expect(eventOutboxRepository.events).toHaveLength(2);
    expect(eventBus.events[0].name).toBe("com.citypass.espacios.ReservaConfirmada");
    // Contrato ReservaConfirmada para una inscripcion; sin datos personales del ciudadano.
    expect(eventBus.events[0].payload).toEqual({
      reservaId: "registration-1",
      tipoReserva: "EVENTO",
      recursoId: "event-1",
      espacioId: "space-1",
      cantidadPersonas: 1,
      inicio: EVENT_START.toISOString(),
      fin: EVENT_END.toISOString()
    });
    expect(JSON.stringify(eventBus.events[0].payload)).not.toContain("ana@test.com");
    expect(emailSender.emails).toHaveLength(1);
    expect(emailSender.emails[0].to).toBe("ana@test.com");
    expect(emailSender.emails[0].subject).toContain("Feria de emprendedores");
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

  describe("republicacion de EventoComunitarioPublicado", () => {
    function published(events: DomainEvent[]) {
      return events.filter((event) => event.name === PUBLISHED);
    }

    it("al inscribirse publica el evento con el total actual de inscriptos y el mismo eventoId", async () => {
      const { useCase, eventBus, eventOutboxRepository } = createUseCase(3);

      await useCase.execute({ communityEventId: "event-1", citizenName: "Ana", citizenEmail: "ana@test.com" });
      await useCase.execute({ communityEventId: "event-1", citizenName: "Beto", citizenEmail: "beto@test.com" });

      const events = published(eventBus.events);
      expect(events).toHaveLength(2);
      expect(published(eventOutboxRepository.events).map((event) => event.id)).toEqual(
        events.map((event) => event.id)
      );
      // Cada publicacion es un DomainEvent nuevo, pero siempre del mismo evento comunitario.
      expect(events[0].id).not.toBe(events[1].id);
      expect(events[1].payload).toEqual({
        eventoId: "event-1",
        espacioId: "space-1",
        titulo: "Feria de emprendedores",
        zona: "Mataderos",
        direccion: "Av. Siempreviva 742",
        latitud: -34.65,
        longitud: -58.5,
        inicio: EVENT_START.toISOString(),
        fin: EVENT_END.toISOString(),
        capacidad: 3,
        cupoMaximo: 3,
        inscriptos: 2,
        estado: "ACTIVE",
        categoria: "Cultura",
        correlationId: "evento-event-1"
      });
      expect(events[0].payload.inscriptos).toBe(1);
    });

    it("al llenar el cupo publica estado ACTIVE_FULL con inscriptos igual al cupo", async () => {
      const { useCase, eventBus } = createUseCase(1);

      await useCase.execute({ communityEventId: "event-1", citizenName: "Ana", citizenEmail: "ana@test.com" });

      const [event] = published(eventBus.events);
      expect(event.payload).toEqual(expect.objectContaining({ inscriptos: 1, estado: "ACTIVE_FULL" }));
    });

    it("no publica nada cuando la inscripcion falla por cupo lleno", async () => {
      const { useCase, eventBus, eventOutboxRepository, communityEventRepository } = createUseCase(1);

      await useCase.execute({ communityEventId: "event-1", citizenName: "Ana", citizenEmail: "ana@test.com" });
      const busBefore = eventBus.events.length;
      const outboxBefore = eventOutboxRepository.events.length;

      // Se fuerza el camino de "sin cupo" con el evento todavia ACTIVE (dos pedidos casi simultaneos).
      communityEventRepository.events[0].status = "ACTIVE";

      await expect(
        useCase.execute({ communityEventId: "event-1", citizenName: "Beto", citizenEmail: "beto@test.com" })
      ).rejects.toThrow("El evento no tiene cupos disponibles.");

      expect(eventBus.events).toHaveLength(busBefore);
      expect(eventOutboxRepository.events).toHaveLength(outboxBefore);
    });
  });
});
