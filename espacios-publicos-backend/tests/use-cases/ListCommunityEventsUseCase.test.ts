import { ListCommunityEventsUseCase } from "../../src/application/use-cases/ListCommunityEventsUseCase";
import { CommunityEvent, CommunityEventStatus, CreateCommunityEventData } from "../../src/domain/entities/CommunityEvent";
import { CommunityEventCatalogItem } from "../../src/domain/entities/CommunityEventCatalogItem";
import {
  CommunityEventCatalogFilters,
  CommunityEventRepository
} from "../../src/domain/repositories/CommunityEventRepository";

class FakeCommunityEventRepository implements CommunityEventRepository {
  public catalogItems: CommunityEventCatalogItem[] = [];
  public lastFilters?: CommunityEventCatalogFilters;

  async create(_data: CreateCommunityEventData): Promise<CommunityEvent> {
    throw new Error("Metodo no usado en esta prueba.");
  }

  async findById(_id: string): Promise<CommunityEvent | null> {
    throw new Error("Metodo no usado en esta prueba.");
  }

  async findAll(): Promise<CommunityEvent[]> {
    throw new Error("Metodo no usado en esta prueba.");
  }

  async findActiveCatalog(filters: CommunityEventCatalogFilters): Promise<CommunityEventCatalogItem[]> {
    this.lastFilters = filters;
    return this.catalogItems;
  }

  async findOverlapping(): Promise<CommunityEvent[]> {
    throw new Error("Metodo no usado en esta prueba.");
  }

  async updateStatus(_id: string, _status: CommunityEventStatus): Promise<CommunityEvent> {
    throw new Error("Metodo no usado en esta prueba.");
  }
}

const catalogItem: CommunityEventCatalogItem = {
  id: "event-1",
  title: "Feria de emprendedores",
  category: "Cultura",
  description: "Encuentro comunitario.",
  organizerName: "Comuna 6",
  capacity: 100,
  registeredCount: 40,
  availableCapacity: 60,
  requiresRegistration: true,
  startDate: new Date("2026-09-15T13:00:00.000Z"),
  endDate: new Date("2026-09-15T20:00:00.000Z"),
  status: "ACTIVE",
  imageUrl: null,
  publicSpace: {
    id: "space-1",
    name: "Parque Centenario",
    address: "Av. Diaz Velez, CABA",
    zone: "Caballito"
  }
};

describe("ListCommunityEventsUseCase", () => {
  it("devuelve eventos activos con cupo disponible segun filtros", async () => {
    const repository = new FakeCommunityEventRepository();
    repository.catalogItems = [catalogItem];
    const useCase = new ListCommunityEventsUseCase(repository);

    const result = await useCase.execute({
      category: "Cultura",
      zone: "Caballito",
      date: "2026-09-15",
      availableOnly: true
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].availableCapacity).toBe(60);
    expect(repository.lastFilters?.category).toBe("Cultura");
    expect(repository.lastFilters?.zone).toBe("Caballito");
    expect(repository.lastFilters?.availableOnly).toBe(true);
  });

  it("informa cuando no hay eventos para los filtros aplicados", async () => {
    const repository = new FakeCommunityEventRepository();
    const useCase = new ListCommunityEventsUseCase(repository);

    const result = await useCase.execute({
      category: "Musica"
    });

    expect(result.items).toEqual([]);
    expect(result.message).toBe(
      "No hay eventos que cumplan los filtros aplicados. Proba ajustando categoria, zona o fecha."
    );
  });

  it("rechaza una fecha invalida", async () => {
    const repository = new FakeCommunityEventRepository();
    const useCase = new ListCommunityEventsUseCase(repository);

    await expect(
      useCase.execute({
        date: "fecha-invalida"
      })
    ).rejects.toThrow("La fecha indicada no es valida.");
  });
});
