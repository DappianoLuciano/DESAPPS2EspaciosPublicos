import { CitizenCommunityEventRegistration } from "../../domain/entities/CommunityEventRegistration";
import { CommunityEventRegistrationRepository } from "../../domain/repositories/CommunityEventRegistrationRepository";
import { NotFoundError } from "../../shared/errors/NotFoundError";

export class GetCommunityEventRegistrationUseCase {
  constructor(
    private readonly communityEventRegistrationRepository: CommunityEventRegistrationRepository
  ) {}

  async execute(id: string): Promise<CitizenCommunityEventRegistration> {
    const registration = await this.communityEventRegistrationRepository.findById(id);
    if (!registration) {
      throw new NotFoundError("La inscripcion indicada no existe.");
    }
    return registration;
  }
}
