import { CommunityEventRegistrationRepository } from "../../domain/repositories/CommunityEventRegistrationRepository";
import { CommunityEventRepository } from "../../domain/repositories/CommunityEventRepository";
import { EventOutboxRepository } from "../../domain/repositories/EventOutboxRepository";
import { PublicSpaceRepository } from "../../domain/repositories/PublicSpaceRepository";
import { EventBus } from "../../domain/services/EventBus";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ForbiddenError } from "../../shared/errors/ForbiddenError";
import { requireEmail, requireText } from "../../shared/validation/inputValidation";
import { buildCommunityEventPublishedEvent } from "../events/communityEventPublished";

export class CancelCommunityEventRegistrationUseCase {
  constructor(
    private readonly communityEventRepository: CommunityEventRepository,
    private readonly communityEventRegistrationRepository: CommunityEventRegistrationRepository,
    private readonly publicSpaceRepository: Pick<PublicSpaceRepository, "findById">,
    private readonly eventOutboxRepository: EventOutboxRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(registrationId: string, citizenEmail?: string): Promise<void> {
    const normalizedRegistrationId = requireText(registrationId, "La inscripcion", 128);
    const normalizedCitizenEmail = requireEmail(citizenEmail);

    const registration = await this.communityEventRegistrationRepository.findById(
      normalizedRegistrationId
    );

    if (!registration) {
      throw new NotFoundError("La reserva indicada no existe.");
    }

    if (registration.citizenEmail.toLowerCase() !== normalizedCitizenEmail) {
      throw new ForbiddenError("No tenes permisos para cancelar esta inscripcion.");
    }

    await this.communityEventRegistrationRepository.deleteById(normalizedRegistrationId);

    if (registration.communityEvent.status === "ACTIVE_FULL") {
      await this.communityEventRepository.updateStatus(registration.communityEventId, "ACTIVE", undefined, "ACTIVE_FULL");
    }

    await this.republishCommunityEvent(registration.communityEventId);
  }

  // Cambiaron los inscriptos (y quizas el estado): se republica el evento con el total actual.
  private async republishCommunityEvent(communityEventId: string): Promise<void> {
    const communityEvent = await this.communityEventRepository.findById(communityEventId);

    // Un evento cancelado ya salio al bus como EventoCancelado: no se lo vuelve a publicar.
    if (!communityEvent || communityEvent.status === "CANCELLED") {
      return;
    }

    const space = await this.publicSpaceRepository.findById(communityEvent.publicSpaceId);
    const inscriptos = await this.communityEventRegistrationRepository.countByEventId(communityEvent.id);
    const event = buildCommunityEventPublishedEvent(communityEvent, space, inscriptos);

    await this.eventOutboxRepository.save(event);
    await this.eventBus.publish(event);
  }
}
