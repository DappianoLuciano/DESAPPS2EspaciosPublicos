import { Prisma } from "@prisma/client";
import { DomainEvent } from "../../domain/entities/DomainEvent";
import { EventOutboxRepository } from "../../domain/repositories/EventOutboxRepository";
import { prisma } from "./prismaClient";

export class PrismaEventOutboxRepository implements EventOutboxRepository {
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
}
