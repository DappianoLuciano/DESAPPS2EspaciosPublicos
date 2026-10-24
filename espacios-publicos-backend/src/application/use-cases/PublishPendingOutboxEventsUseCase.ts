import { ReliableEventOutboxRepository } from "../../domain/repositories/ReliableEventOutboxRepository";
import { EventBus } from "../../domain/services/EventBus";
import { logger } from "../../shared/logging/logger";

export interface OutboxDeliveryResult {
  processed: number;
  published: number;
  failed: number;
}

export class PublishPendingOutboxEventsUseCase {
  constructor(
    private readonly repository: ReliableEventOutboxRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(limit = 25): Promise<OutboxDeliveryResult> {
    const events = await this.repository.findReady(limit, new Date());
    let published = 0;
    let failed = 0;

    for (const event of events) {
      try {
        await this.eventBus.publish(event);
        await this.repository.markPublished(event.id, new Date());
        published += 1;
      } catch (error) {
        const attempts = event.attempts + 1;
        const delayMinutes = Math.min(60, 2 ** Math.min(attempts, 6));
        const nextAttemptAt = new Date(Date.now() + delayMinutes * 60_000);
        const message = error instanceof Error ? error.message : "Error desconocido al publicar.";
        await this.repository.markFailed(event.id, message, nextAttemptAt);
        logger.warn({ eventId: event.id, eventName: event.name, attempts }, "Outbox publish failed");
        failed += 1;
      }
    }

    return { processed: events.length, published, failed };
  }
}
