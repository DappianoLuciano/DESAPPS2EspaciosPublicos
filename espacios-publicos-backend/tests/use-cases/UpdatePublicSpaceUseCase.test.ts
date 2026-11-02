import { UpdatePublicSpaceUseCase } from "../../src/application/use-cases/UpdatePublicSpaceUseCase";
import { DomainEvent } from "../../src/domain/entities/DomainEvent";

const space = {
  id: "space-1",
  name: "Plaza",
  description: "d",
  address: "Av. Siempreviva 742",
  zone: "Centro",
  capacity: 100,
  latitude: -34.6037,
  longitude: -58.3816,
  status: "ENABLED" as const,
  createdAt: new Date()
};

function build(current = space) {
  const saved: DomainEvent[] = [];
  const published: DomainEvent[] = [];
  // Como Prisma, ignora los campos undefined al actualizar.
  const update = jest.fn(async (_id: string, data: Record<string, unknown>) => ({
    ...current,
    ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))
  }));
  const useCase = new UpdatePublicSpaceUseCase(
    { findById: jest.fn().mockResolvedValue(current), update } as never,
    { save: async (event: DomainEvent) => void saved.push(event) },
    { publish: async (event: DomainEvent) => void published.push(event) }
  );

  return { useCase, saved, published };
}

describe("UpdatePublicSpaceUseCase - EspacioEstadoCambiado", () => {
  it("publica el contrato exacto cuando cambia el estado del espacio", async () => {
    const { useCase, saved, published } = build();

    await useCase.execute("space-1", { status: "DISABLED" });

    expect(saved).toHaveLength(1);
    expect(published).toEqual(saved);
    expect(saved[0].name).toBe("com.citypass.espacios.EspacioEstadoCambiado");
    expect(saved[0].payload).toEqual({
      espacioId: "space-1",
      estadoNuevo: "DISABLED",
      zona: "Centro",
      latitud: -34.6037,
      longitud: -58.3816,
      cambiadoEn: saved[0].occurredAt.toISOString()
    });
  });

  it("manda null en zona y coordenadas ausentes", async () => {
    const { useCase, saved } = build({
      ...space,
      zone: undefined as never,
      latitude: null as never,
      longitude: null as never
    });

    await useCase.execute("space-1", { status: "DISABLED" });

    expect(saved[0].payload).toMatchObject({ zona: null, latitud: null, longitud: null });
  });

  it("no publica si el estado no cambia", async () => {
    const { useCase, saved } = build();

    await useCase.execute("space-1", { name: "Plaza Mayor", status: "ENABLED" });

    expect(saved).toHaveLength(0);
  });
});
