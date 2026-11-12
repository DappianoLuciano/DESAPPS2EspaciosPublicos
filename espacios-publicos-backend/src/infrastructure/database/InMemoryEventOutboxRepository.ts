import { DomainEvent } from "../../domain/entities/DomainEvent";
import { OutboxEvent } from "../../domain/entities/OutboxEvent";
import { ReliableEventOutboxRepository } from "../../domain/repositories/ReliableEventOutboxRepository";

/** Outbox aislado para pruebas HTTP; producción siempre usa PrismaEventOutboxRepository. */
export class InMemoryEventOutboxRepository
  implements ReliableEventOutboxRepository
{
  private readonly events = new Map<string, OutboxEvent>();

  async save(event: DomainEvent): Promise<void> {
    this.events.set(event.id, {
      ...event,
      payload: { ...event.payload },
      occurredAt: new Date(event.occurredAt),
      status: "PENDING",
      attempts: 0,
      nextAttemptAt: null,
      lastError: null,
      publishedAt: null
    });
  }

  async findReady(limit: number, now: Date): Promise<OutboxEvent[]> {
    return Array.from(this.events.values())
      .filter(event =>
        event.status === "PENDING" &&
        (!event.nextAttemptAt || event.nextAttemptAt <= now)
      )
      .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime())
      .slice(0, limit)
      .map(clone);
  }

  async markPublished(id: string, publishedAt: Date): Promise<void> {
    this.update(id, {
      status: "PUBLISHED",
      publishedAt: new Date(publishedAt),
      nextAttemptAt: null,
      lastError: null
    });
  }

  async markFailed(id: string, error: string, nextAttemptAt: Date): Promise<void> {
    const event = this.require(id);
    this.update(id, {
      status: "PENDING",
      attempts: event.attempts + 1,
      nextAttemptAt: new Date(nextAttemptAt),
      lastError: error
    });
  }

  async markExhausted(id: string, error: string): Promise<void> {
    const event = this.require(id);
    this.update(id, {
      status: "FAILED",
      attempts: event.attempts + 1,
      nextAttemptAt: null,
      lastError: error
    });
  }

  private require(id: string): OutboxEvent {
    const event = this.events.get(id);
    if (!event) throw new Error(`No existe el evento de outbox ${id}.`);
    return event;
  }

  private update(id: string, changes: Partial<OutboxEvent>): void {
    this.events.set(id, { ...this.require(id), ...changes });
  }
}

function clone(event: OutboxEvent): OutboxEvent {
  return {
    ...event,
    payload: { ...event.payload },
    occurredAt: new Date(event.occurredAt),
    nextAttemptAt: event.nextAttemptAt ? new Date(event.nextAttemptAt) : null,
    publishedAt: event.publishedAt ? new Date(event.publishedAt) : null
  };
}
