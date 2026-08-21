import { CommunityEventRegistration } from "../../domain/entities/CommunityEventRegistration";
import { CommunityEventRegistrationRepository } from "../../domain/repositories/CommunityEventRegistrationRepository";
import { CommunityEventRepository } from "../../domain/repositories/CommunityEventRepository";
import { NotFoundError } from "../../shared/errors/NotFoundError";

export class ListCommunityEventRegistrationsUseCase {
  constructor(
    private readonly communityEventRepository: CommunityEventRepository,
    private readonly communityEventRegistrationRepository: CommunityEventRegistrationRepository
  ) {}

  async execute(communityEventId: string): Promise<CommunityEventRegistration[]> {
    const communityEvent = await this.communityEventRepository.findById(communityEventId);

    if (!communityEvent) {
      throw new NotFoundError("El evento comunitario indicado no existe.");
    }

    return this.communityEventRegistrationRepository.findByEventId(communityEventId);
  }
}
