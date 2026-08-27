import { CitizenCommunityEventRegistration } from "../../domain/entities/CommunityEventRegistration";
import { CommunityEventRegistrationRepository } from "../../domain/repositories/CommunityEventRegistrationRepository";
import { ValidationError } from "../../shared/errors/ValidationError";

export class ListCitizenCommunityEventRegistrationsUseCase {
  constructor(
    private readonly communityEventRegistrationRepository: CommunityEventRegistrationRepository
  ) {}

  async execute(citizenEmail?: string): Promise<CitizenCommunityEventRegistration[]> {
    if (!citizenEmail) {
      throw new ValidationError("El email del ciudadano es obligatorio.");
    }

    return this.communityEventRegistrationRepository.findByCitizenEmail(citizenEmail);
  }
}
