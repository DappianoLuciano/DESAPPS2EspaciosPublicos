import { DomainEvent } from "../../domain/entities/DomainEvent";
import { ReliableEventOutboxRepository } from "../../domain/repositories/ReliableEventOutboxRepository";
import { EventBus } from "../../domain/services/EventBus";
import { logger } from "../../shared/logging/logger";

type OutboxStatusWriter = Pick<ReliableEventOutboxRepository, "markPublished" | "markFailed">;

/**
 * Los casos de uso guardan el evento en el outbox y despues lo publican en el bus.
 * Este decorador deja el estado del registro al dia: si el bus real acepta el evento
 * lo marca como publicado (y el worker no lo reenvia); si falla, programa el reintento
 * y no propaga el error, para que un gateway caido no tire la reserva o la inscripcion.
 */
export class OutboxTrackingEventBus implements EventBus {
  constructor(
    private readonly inner: EventBus,
    private readonly outbox: OutboxStatusWriter
  ) {}

  async publish(event: DomainEvent): Promise<void> {
    try {
      await this.inner.publish(event);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido al publicar.";
      logger.warn({ eventId: event.id, eventName: event.name }, "Publicacion inmediata fallida; queda en el outbox");
      await this.safely(() => this.outbox.markFailed(event.id, message, retryAt()), event);
      return;
    }

    await this.safely(() => this.outbox.markPublished(event.id, new Date()), event);
  }

  private async safely(action: () => Promise<void>, event: DomainEvent): Promise<void> {
    try {
      await action();
    } catch (error) {
      logger.error({ err: error, eventId: event.id }, "No se pudo actualizar el estado del outbox");
    }
  }
}

// Mismo backoff que PublishPendingOutboxEventsUseCase para el primer reintento.
function retryAt(): Date {
  return new Date(Date.now() + 2 * 60_000);
}
