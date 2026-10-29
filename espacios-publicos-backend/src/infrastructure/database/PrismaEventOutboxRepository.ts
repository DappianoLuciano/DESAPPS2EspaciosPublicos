import { Prisma } from "@prisma/client";
import { DomainEvent } from "../../domain/entities/DomainEvent";
import { EventOutboxRepository } from "../../domain/repositories/EventOutboxRepository";
import { ReliableEventOutboxRepository } from "../../domain/repositories/ReliableEventOutboxRepository";
import { OutboxEvent } from "../../domain/entities/OutboxEvent";
import { dispatchableEventNames } from "../../shared/events/eventTypes";
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
    // Solo se despachan los eventos con contrato FQN registrado (clima, eventos, espacios
    // y reservas). Las filas historicas con nombres viejos ("cultura.*") se dejan como estan.
    const dispatchableNames = dispatchableEventNames();
    const events = await prisma.eventOutbox.findMany({
      where: {
        name: { in: dispatchableNames },
        // FAILED es terminal (se agotaron los intentos); los reintentos pendientes siguen PENDING.
        status: "PENDING",
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
        status: "PENDING",
        attempts: { increment: 1 },
        nextAttemptAt,
        lastError: error.slice(0, 2000)
      }
    });
  }

  async markExhausted(id: string, error: string): Promise<void> {
    await prisma.eventOutbox.update({
      where: { id },
      data: {
        status: "FAILED",
        attempts: { increment: 1 },
        nextAttemptAt: null,
        lastError: error.slice(0, 2000)
      }
    });
  }
}
