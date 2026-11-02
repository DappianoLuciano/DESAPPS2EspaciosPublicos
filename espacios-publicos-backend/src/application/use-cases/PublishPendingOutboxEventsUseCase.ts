import { ReliableEventOutboxRepository } from "../../domain/repositories/ReliableEventOutboxRepository";
import { EventBus } from "../../domain/services/EventBus";
import { getOutboxMaxAttempts } from "../../shared/events/outboxConfig";
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
    const maxAttempts = getOutboxMaxAttempts();
    let published = 0;
    let failed = 0;

    for (const event of events) {
      try {
        await this.eventBus.publish(event);
        await this.repository.markPublished(event.id, new Date());
        published += 1;
      } catch (error) {
        const attempts = event.attempts + 1;
        const message = error instanceof Error ? error.message : "Error desconocido al publicar.";

        if (attempts >= maxAttempts) {
          // Tope alcanzado: la fila queda FAILED con el ultimo error y deja de reintentarse.
          await this.repository.markExhausted(event.id, message);
          logger.error(
            { eventId: event.id, eventName: event.name, attempts, maxAttempts, lastError: message },
            "Outbox: se agotaron los intentos de publicacion; el evento no se reintenta mas"
          );
        } else {
          const delayMinutes = Math.min(60, 2 ** Math.min(attempts, 6));
          const nextAttemptAt = new Date(Date.now() + delayMinutes * 60_000);
          await this.repository.markFailed(event.id, message, nextAttemptAt);
          logger.warn({ eventId: event.id, eventName: event.name, attempts, maxAttempts }, "Outbox publish failed");
        }
        failed += 1;
      }
    }

    return { processed: events.length, published, failed };
  }
}
