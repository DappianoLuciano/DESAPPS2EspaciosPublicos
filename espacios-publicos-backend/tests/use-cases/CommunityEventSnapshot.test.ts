import { CommunityEventSnapshotPublisher } from "../../src/application/events/communityEventPublished";
import { ChangeCommunityEventSuspensionUseCase } from "../../src/application/use-cases/ChangeCommunityEventSuspensionUseCase";
import { CommunityEvent, CommunityEventStatus } from "../../src/domain/entities/CommunityEvent";
import { DomainEvent } from "../../src/domain/entities/DomainEvent";

const PUBLISHED = "com.citypass.espacios.EventoComunitarioPublicado";

const SPACE = {
  id: "p1", name: "Plaza", description: "d", address: "Av. Córdoba 2100", zone: "Recoleta", capacity: 6000,
  latitude: -34.5994, longitude: -58.3988, status: "ENABLED" as const, createdAt: new Date()
};

function setup(initial: CommunityEventStatus, count = 2) {
  const event: CommunityEvent = {
    id: "e1", title: "Feria", category: "Cultura", tags: [], description: "d", requirements: [],
    publicSpaceId: "p1", organizerName: "Municipio", capacity: 3, requiresRegistration: true,
    startDate: new Date(Date.now() + 3600_000), endDate: new Date(Date.now() + 7200_000),
    createdAt: new Date(), status: initial
  };
  // El repositorio refleja el estado guardado, como la base.
  const findById = jest.fn(async () => ({ ...event }));
  const updateStatus = jest.fn(async (_id: string, next: CommunityEventStatus) => {
    event.status = next;
    return { ...event };
  });
  const countByEventId = jest.fn().mockResolvedValue(count);
  const saved: DomainEvent[] = [];
  const published: DomainEvent[] = [];
  const snapshots = new CommunityEventSnapshotPublisher(
    { findById },
    { findById: async () => SPACE },
    { countByEventId },
    { save: async (domainEvent: DomainEvent) => void saved.push(domainEvent) },
    { publish: async (domainEvent: DomainEvent) => void published.push(domainEvent) }
  );
  const useCase = new ChangeCommunityEventSuspensionUseCase(
    { findById, updateStatus } as never,
    { countByEventId } as never,
    { findById: async () => SPACE } as never,
    snapshots
  );
  return { useCase, snapshots, saved, published, event };
}

describe("snapshot de EventoComunitarioPublicado al suspender y reanudar", () => {
  it("al suspender publica el evento con estado SUSPENDED e inscriptos actuales", async () => {
    const { useCase, saved, published } = setup("ACTIVE", 2);

    await useCase.execute("e1", "suspend", "Alerta climática");

    expect(saved).toHaveLength(1);
    expect(published.map((event) => event.id)).toEqual(saved.map((event) => event.id));
    expect(saved[0].name).toBe(PUBLISHED);
    expect(saved[0].payload).toEqual(expect.objectContaining({
      eventoId: "e1", estado: "SUSPENDED", inscriptos: 2, correlationId: "evento-e1"
    }));
  });

  it.each([[2, "ACTIVE"], [3, "ACTIVE_FULL"]] as const)("al reanudar con %s inscriptos publica %s", async (count, estado) => {
    const { useCase, saved } = setup("SUSPENDED", count);

    await useCase.execute("e1", "resume");

    expect(saved).toHaveLength(1);
    expect(saved[0].payload).toEqual(expect.objectContaining({ estado, inscriptos: count }));
  });

  it("una suspension rechazada no publica nada", async () => {
    const { useCase, saved } = setup("SUSPENDED");

    await expect(useCase.execute("e1", "suspend", "Clima")).rejects.toThrow("ya está");

    expect(saved).toHaveLength(0);
  });

  it("no republica un evento cancelado y no duplica ids", async () => {
    const { snapshots, saved, event } = setup("ACTIVE");

    await snapshots.publish(["e1", "e1"]);
    expect(saved).toHaveLength(1);

    event.status = "CANCELLED";
    await snapshots.publish(["e1"]);
    expect(saved).toHaveLength(1);
  });
});
