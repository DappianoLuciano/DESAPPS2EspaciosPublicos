import {
  DestinationRecommendation,
  SaveDestinationRecommendationData
} from "../../domain/entities/DestinationRecommendation";
import { DestinationRecommendationRepository } from "../../domain/repositories/DestinationRecommendationRepository";
import { prisma } from "./prismaClient";

export class PrismaDestinationRecommendationRepository implements DestinationRecommendationRepository {
  async findByEventId(eventoId: string): Promise<DestinationRecommendation | null> {
    const row = await prisma.destinationRecommendation.findUnique({ where: { eventoId } });

    return row as DestinationRecommendation | null;
  }

  async saveIfNewer(data: SaveDestinationRecommendationData): Promise<boolean> {
    const { eventoId, ...fields } = data;

    // La condicion va en el UPDATE para que dos entregas concurrentes no se pisen.
    const updated = await prisma.destinationRecommendation.updateMany({
      where: { eventoId, calculadaEn: { lt: data.calculadaEn } },
      data: { ...fields, receivedAt: new Date() }
    });

    if (updated.count > 0) {
      return true;
    }

    // Sin fila previa se crea; si ya hay una igual o mas nueva, skipDuplicates la deja como esta.
    const created = await prisma.destinationRecommendation.createMany({
      data: [data],
      skipDuplicates: true
    });

    return created.count === 1;
  }
}
