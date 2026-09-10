import { DomainEvent } from "../../domain/entities/DomainEvent";
import { EventBus } from "../../domain/services/EventBus";

export class ConsoleEventBus implements EventBus {
  public readonly publishedEvents: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.publishedEvents.push(event);

    console.log("[EventBus]", {
      id: event.id,
      name: event.name,
      occurredAt: event.occurredAt.toISOString()
    });
  }
}
