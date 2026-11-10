import { BikeStationRecord, BikeStationRepository } from "../../domain/repositories/BikeStationRepository";
import { prisma } from "./prismaClient";

export class PrismaBikeStationRepository implements BikeStationRepository {
  async saveIfNewer(station: BikeStationRecord): Promise<boolean> {
    const { id, ...fields } = station;
    const data = { ...fields, receivedAt: new Date() };

    // Solo pisa si el dato que llega es mas nuevo: el bus puede entregar fuera de orden.
    const updated = await prisma.bikeStation.updateMany({
      where: { id, updatedAt: { lt: station.updatedAt } },
      data
    });

    if (updated.count > 0) {
      return true;
    }

    const created = await prisma.bikeStation.createMany({ data: [{ id, ...data }], skipDuplicates: true });
    return created.count > 0;
  }

  async findActive(): Promise<BikeStationRecord[]> {
    return prisma.bikeStation.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        availableBikes: true,
        availableSlots: true,
        capacity: true,
        active: true,
        updatedAt: true
      }
    });
  }
}
