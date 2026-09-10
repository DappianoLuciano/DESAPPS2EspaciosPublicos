import { CommunityEventRegistrationRepository } from "../../domain/repositories/CommunityEventRegistrationRepository";
import { CommunityEventRepository } from "../../domain/repositories/CommunityEventRepository";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ForbiddenError } from "../../shared/errors/ForbiddenError";
import { requireEmail, requireText } from "../../shared/validation/inputValidation";

export class CancelCommunityEventRegistrationUseCase {
  constructor(
    private readonly communityEventRepository: CommunityEventRepository,
    private readonly communityEventRegistrationRepository: CommunityEventRegistrationRepository
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
      await this.communityEventRepository.updateStatus(registration.communityEventId, "ACTIVE");
    }
  }
}
