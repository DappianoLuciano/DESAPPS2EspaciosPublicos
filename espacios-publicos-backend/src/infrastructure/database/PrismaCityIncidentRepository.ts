import {
  CityIncidentRecord,
  CityIncidentSource,
  GeoBounds,
  UpsertCityIncidentData
} from "../../domain/entities/CityIncidentRecord";
import { CityIncidentRepository } from "../../domain/repositories/CityIncidentRepository";
import { prisma } from "./prismaClient";

export class PrismaCityIncidentRepository implements CityIncidentRepository {
  async upsertActive(data: UpsertCityIncidentData): Promise<void> {
    const { source, externalId, ...fields } = data;

    await prisma.cityIncident.upsert({
      where: { source_externalId: { source, externalId } },
      create: { source, externalId, ...fields, active: true },
      update: { ...fields, active: true }
    });
  }

  async deactivate(source: CityIncidentSource, externalId: string): Promise<void> {
    await prisma.cityIncident.updateMany({
      where: { source, externalId },
      data: { active: false }
    });
  }

  async findActiveInBounds(bounds: GeoBounds): Promise<CityIncidentRecord[]> {
    const rows = await prisma.cityIncident.findMany({
      where: {
        active: true,
        latitude: { gte: bounds.minLatitude, lte: bounds.maxLatitude },
        longitude: { gte: bounds.minLongitude, lte: bounds.maxLongitude }
      }
    });

    return rows as CityIncidentRecord[];
  }
}
