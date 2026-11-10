import {
  InboundEventEntry,
  InboundTypeSummary,
  IntegrationStatusRepository,
  OutboxNameSummary,
  OutboxProblemEntry
} from "../../domain/repositories/IntegrationStatusRepository";
import { prisma } from "./prismaClient";

export class PrismaIntegrationStatusRepository implements IntegrationStatusRepository {
  async inboundByType(): Promise<InboundTypeSummary[]> {
    const rows = await prisma.inboundEvent.groupBy({
      by: ["eventType"],
      _count: { _all: true },
      _max: { receivedAt: true }
    });

    return rows
      .map((row) => ({ eventType: row.eventType, count: row._count._all, lastReceivedAt: row._max.receivedAt as Date }))
      .sort((a, b) => b.lastReceivedAt.getTime() - a.lastReceivedAt.getTime());
  }

  async recentInbound(limit: number): Promise<InboundEventEntry[]> {
    return prisma.inboundEvent.findMany({ orderBy: { receivedAt: "desc" }, take: limit });
  }

  async outboxByName(names: string[]): Promise<OutboxNameSummary[]> {
    const rows = await prisma.eventOutbox.groupBy({
      by: ["name", "status"],
      where: { name: { in: names } },
      _count: { _all: true },
      _max: { createdAt: true }
    });
    const byName = new Map<string, OutboxNameSummary>(
      names.map((name) => [name, { name, published: 0, pending: 0, failed: 0, lastCreatedAt: null }])
    );

    for (const row of rows) {
      const summary = byName.get(row.name)!;
      const count = row._count._all;
      if (row.status === "PUBLISHED") summary.published += count;
      else if (row.status === "PENDING") summary.pending += count;
      else summary.failed += count;
      const last = row._max.createdAt;
      if (last && (!summary.lastCreatedAt || last > summary.lastCreatedAt)) summary.lastCreatedAt = last;
    }

    return [...byName.values()];
  }

  async outboxProblems(names: string[], limit: number): Promise<OutboxProblemEntry[]> {
    const rows = await prisma.eventOutbox.findMany({
      where: { name: { in: names }, status: { in: ["PENDING", "FAILED"] } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, name: true, status: true, attempts: true, lastError: true, createdAt: true }
    });

    return rows as OutboxProblemEntry[];
  }
}
