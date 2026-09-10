import { CitizenCommunityEventRegistration } from "../../domain/entities/CommunityEventRegistration";
import { CommunityEventRegistrationRepository } from "../../domain/repositories/CommunityEventRegistrationRepository";
import { requireEmail } from "../../shared/validation/inputValidation";

export class ListCitizenCommunityEventRegistrationsUseCase {
  constructor(
    private readonly communityEventRegistrationRepository: CommunityEventRegistrationRepository
  ) {}

  async execute(citizenEmail?: string): Promise<CitizenCommunityEventRegistration[]> {
    return this.communityEventRegistrationRepository.findByCitizenEmail(requireEmail(citizenEmail));
  }
}
