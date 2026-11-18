import { Prisma } from "@prisma/client";
import {
  ActivePublicSpaceAffectation,
  PublicSpaceAffectationFilter,
  PublicSpaceAffectationRepository,
  SavePublicSpaceAffectationData
} from "../../domain/repositories/PublicSpaceAffectationRepository";
import { prisma } from "./prismaClient";

export class PrismaPublicSpaceAffectationRepository implements PublicSpaceAffectationRepository {
  async saveActive(data: SavePublicSpaceAffectationData): Promise<void> {
    const fields = {
      publicSpaceId: data.espacioId,
      tipoAfectacion: data.tipoAfectacion,
      causaTipo: data.causaTipo,
      causaId: data.causaId,
      correlationId: data.correlationId,
      since: data.desde,
      estimatedUntil: data.hastaEstimada,
      restoredAt: null
    };

    await prisma.publicSpaceAffectation.upsert({
      where: { id: data.afectacionId },
      create: { id: data.afectacionId, ...fields },
      update: fields
    });
  }

  async restore(filter: PublicSpaceAffectationFilter, restoredAt: Date): Promise<ActivePublicSpaceAffectation[]> {
    const where: Prisma.PublicSpaceAffectationWhereInput = { restoredAt: null };
    if (filter.afectacionIds) where.id = { in: filter.afectacionIds };
    if (filter.espacioId) where.publicSpaceId = filter.espacioId;
    if (filter.causaId) where.causaId = filter.causaId;
    if (filter.causaTipos) {
      const named = filter.causaTipos.filter((tipo): tipo is string => tipo !== null);
      where.OR = [
        ...(named.length ? [{ causaTipo: { in: named } }] : []),
        ...(filter.causaTipos.includes(null) ? [{ causaTipo: null }] : [])
      ];
    }

    return prisma.$transaction(async (tx) => {
      const rows = await tx.publicSpaceAffectation.findMany({
        where,
        select: { id: true, publicSpaceId: true, correlationId: true },
        orderBy: { createdAt: "asc" }
      });
      if (!rows.length) return [];
      await tx.publicSpaceAffectation.updateMany({
        where: { id: { in: rows.map((row) => row.id) }, restoredAt: null },
        data: { restoredAt }
      });
      return rows.map((row) => ({ afectacionId: row.id, espacioId: row.publicSpaceId, correlationId: row.correlationId }));
    });
  }
}
