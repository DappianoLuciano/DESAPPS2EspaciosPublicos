import { DomainEvent } from "../../domain/entities/DomainEvent";
import { EventBus } from "../../domain/services/EventBus";
import { logger } from "../../shared/logging/logger";
import { eventNames } from "../../shared/events/eventTypes";

export class ConsoleEventBus implements EventBus {
  public readonly publishedEvents: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.publishedEvents.push(event);
    const isWeatherEvent = event.name === eventNames.weatherConfirmed() || event.name === eventNames.weatherFinalized();

    logger.info(
      {
        id: event.id,
        name: event.name,
        occurredAt: event.occurredAt.toISOString(),
        ...(isWeatherEvent ? { driver: "console", simulated: true, payload: event.payload } : {})
      },
      "[EventBus]"
    );
  }
}
