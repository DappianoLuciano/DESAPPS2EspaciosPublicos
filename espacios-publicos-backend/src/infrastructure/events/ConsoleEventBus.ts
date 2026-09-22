import { DomainEvent } from "../../domain/entities/DomainEvent";
import { EventBus } from "../../domain/services/EventBus";
import { logger } from "../../shared/logging/logger";

export class ConsoleEventBus implements EventBus {
  public readonly publishedEvents: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.publishedEvents.push(event);

    logger.info(
      {
        id: event.id,
        name: event.name,
        occurredAt: event.occurredAt.toISOString()
      },
      "[EventBus]"
    );
  }
}
