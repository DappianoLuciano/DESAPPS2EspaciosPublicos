import { randomUUID } from "crypto";
import { CommunityEvent } from "../../domain/entities/CommunityEvent";
import { DomainEvent } from "../../domain/entities/DomainEvent";
import { CommunityEventRepository } from "../../domain/repositories/CommunityEventRepository";
import { EventOutboxRepository } from "../../domain/repositories/EventOutboxRepository";
import { EventBus } from "../../domain/services/EventBus";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ValidationError } from "../../shared/errors/ValidationError";
import { eventNames } from "../../shared/events/eventTypes";
import { nullableText, requireText } from "../../shared/validation/inputValidation";

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "string" && !value.trim());
}

export class CancelCommunityEventUseCase {
  constructor(
    private readonly communityEventRepository: CommunityEventRepository,
    private readonly eventOutboxRepository: EventOutboxRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(id: string, reason?: unknown): Promise<CommunityEvent> {
    const communityEventId = requireText(id, "El evento", 128);
    // El motivo es opcional: sin el, el contrato EventoCancelado lo manda en null.
    const cancellationReason = isBlank(reason)
      ? null
      : nullableText(reason, "El motivo de la cancelacion", 500) ?? null;

    const communityEvent = await this.communityEventRepository.findById(communityEventId);

    if (!communityEvent) {
      throw new NotFoundError("El evento comunitario indicado no existe.");
    }

    if (communityEvent.status === "CANCELLED") {
      throw new ValidationError("El evento ya se encuentra cancelado.");
    }

    if (communityEvent.endDate.getTime() <= Date.now()) {
      throw new ValidationError("El evento ya termino y no puede cancelarse.");
    }

    const cancelled = await this.communityEventRepository.updateStatus(communityEventId, "CANCELLED");
    const cancelledAt = new Date();

    const event: DomainEvent = {
      id: randomUUID(),
      name: eventNames.communityEventCancelled(),
      payload: {
        eventoId: communityEvent.id,
        espacioId: communityEvent.publicSpaceId,
        motivo: cancellationReason,
        canceladoEn: cancelledAt.toISOString(),
        correlationId: `evento-${communityEvent.id}`
      },
      occurredAt: cancelledAt
    };

    await this.eventOutboxRepository.save(event);
    await this.eventBus.publish(event);

    return cancelled;
  }
}
