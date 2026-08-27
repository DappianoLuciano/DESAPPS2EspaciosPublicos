import { CommunityEventRegistrationRepository } from "../../domain/repositories/CommunityEventRegistrationRepository";
import { CommunityEventRepository } from "../../domain/repositories/CommunityEventRepository";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ValidationError } from "../../shared/errors/ValidationError";

export class CancelCommunityEventRegistrationUseCase {
  constructor(
    private readonly communityEventRepository: CommunityEventRepository,
    private readonly communityEventRegistrationRepository: CommunityEventRegistrationRepository
  ) {}

  async execute(registrationId: string, citizenEmail?: string): Promise<void> {
    if (!citizenEmail) {
      throw new ValidationError("El email del ciudadano es obligatorio.");
    }

    const registration = await this.communityEventRegistrationRepository.findById(registrationId);

    if (!registration) {
      throw new NotFoundError("La reserva indicada no existe.");
    }

    if (registration.citizenEmail.toLowerCase() !== citizenEmail.toLowerCase()) {
      throw new ValidationError("La reserva no pertenece al ciudadano indicado.");
    }

    await this.communityEventRegistrationRepository.deleteById(registrationId);

    if (registration.communityEvent.status === "ACTIVE_FULL") {
      await this.communityEventRepository.updateStatus(registration.communityEventId, "ACTIVE");
    }
  }
}
