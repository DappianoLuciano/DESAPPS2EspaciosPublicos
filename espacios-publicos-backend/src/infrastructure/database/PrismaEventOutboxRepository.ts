import { Prisma } from "@prisma/client";
import { DomainEvent } from "../../domain/entities/DomainEvent";
import { EventOutboxRepository } from "../../domain/repositories/EventOutboxRepository";
import { ReliableEventOutboxRepository } from "../../domain/repositories/ReliableEventOutboxRepository";
import { OutboxEvent } from "../../domain/entities/OutboxEvent";
import { prisma } from "./prismaClient";

export class PrismaEventOutboxRepository implements EventOutboxRepository, ReliableEventOutboxRepository {
  async save(event: DomainEvent): Promise<void> {
    await prisma.eventOutbox.create({
      data: {
        id: event.id,
        name: event.name,
        payload: event.payload as Prisma.InputJsonValue,
        occurredAt: event.occurredAt
      }
    });
  }

  async findReady(limit: number, now: Date): Promise<OutboxEvent[]> {
    // Los eventos historicos del modulo todavia usan publicacion directa. Hasta migrarlos
    // al flujo transaccional completo, este worker solo debe despachar los contratos climaticos.
    const weatherEventNames = [
      process.env.WEATHER_CONFIRMED_EVENT_FQN?.trim() ||
        "com.citypass.espacios.CriticidadClimaticaConfirmada",
      process.env.WEATHER_FINALIZED_EVENT_FQN?.trim() ||
        "com.citypass.espacios.CriticidadClimaticaFinalizada"
    ];
    const events = await prisma.eventOutbox.findMany({
      where: {
        name: { in: weatherEventNames },
        status: { in: ["PENDING", "FAILED"] },
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }]
      },
      orderBy: { createdAt: "asc" },
      take: limit
    });

    return events.map((event) => ({
      id: event.id,
      name: event.name,
      payload: event.payload as Record<string, unknown>,
      occurredAt: event.occurredAt,
      status: event.status,
      attempts: event.attempts,
      nextAttemptAt: event.nextAttemptAt,
      lastError: event.lastError,
      publishedAt: event.publishedAt
    }));
  }

  async markPublished(id: string, publishedAt: Date): Promise<void> {
    await prisma.eventOutbox.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        publishedAt,
        nextAttemptAt: null,
        lastError: null
      }
    });
  }

  async markFailed(id: string, error: string, nextAttemptAt: Date): Promise<void> {
    await prisma.eventOutbox.update({
      where: { id },
      data: {
        status: "FAILED",
        attempts: { increment: 1 },
        nextAttemptAt,
        lastError: error.slice(0, 2000)
      }
    });
  }
}
