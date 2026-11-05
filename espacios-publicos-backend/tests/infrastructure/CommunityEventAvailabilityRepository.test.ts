import { PrismaCommunityEventRepository } from "../../src/infrastructure/database/PrismaCommunityEventRepository";
import { prisma } from "../../src/infrastructure/database/prismaClient";

jest.mock("../../src/infrastructure/database/prismaClient", () => ({
  prisma: { communityEvent: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() } }
}));

describe("Disponibilidad de eventos persistida", () => {
  const repository = new PrismaCommunityEventRepository();
  beforeEach(() => jest.clearAllMocks());

  it("conserva el horario de un evento suspendido al comprobar superposiciones", async () => {
    (prisma.communityEvent.findMany as jest.Mock).mockResolvedValue([]);
    const start = new Date();
    const end = new Date(start.getTime() + 3600_000);
    await repository.findOverlapping("p1", start, end);
    expect(prisma.communityEvent.findMany).toHaveBeenCalledWith({ where: {
      publicSpaceId: "p1", status: { in: ["ACTIVE", "ACTIVE_FULL", "SUSPENDED"] },
      startDate: { lt: end }, endDate: { gt: start }
    } });
  });

  const row = (status: string) => ({
    id: status, title: "Feria", status, statusReason: "Clima adverso", capacity: 50,
    requiresRegistration: true, publicSpace: { id: "p1", name: "Plaza", address: "Calle", zone: "Centro" },
    _count: { registrations: 2 }
  });

  it("muestra el motivo público y el detalle de un cancelado", async () => {
    (prisma.communityEvent.findFirst as jest.Mock).mockResolvedValue(row("CANCELLED"));
    const event = await repository.findActiveCatalogById("CANCELLED");
    expect(event?.status).toBe("CANCELLED");
    expect(event?.statusReason).toBe("Clima adverso");
    expect(prisma.communityEvent.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "CANCELLED" } }));
  });

  it("availableOnly excluye suspendidos, cancelados y completos aunque tengan cupos", async () => {
    (prisma.communityEvent.findMany as jest.Mock).mockResolvedValue(
      ["ACTIVE", "SUSPENDED", "CANCELLED", "ACTIVE_FULL"].map(row)
    );
    const items = await repository.findActiveCatalog({ includeUnavailable: true, availableOnly: true });
    expect(items.map(item => item.status)).toEqual(["ACTIVE"]);
  });

  it("condiciona la transición al estado leído y guarda el motivo", async () => {
    (prisma.communityEvent.update as jest.Mock).mockResolvedValue(row("SUSPENDED"));
    await repository.updateStatus("e1", "SUSPENDED", "Clima adverso", "ACTIVE");
    expect(prisma.communityEvent.update).toHaveBeenCalledWith({
      where: { id: "e1", status: "ACTIVE" }, data: { status: "SUSPENDED", statusReason: "Clima adverso" }
    });
  });
});
