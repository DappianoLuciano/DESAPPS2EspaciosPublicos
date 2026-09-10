import { CommunityEventRegistration } from "../../domain/entities/CommunityEventRegistration";
import { CommunityEventRegistrationRepository } from "../../domain/repositories/CommunityEventRegistrationRepository";
import { CommunityEventRepository } from "../../domain/repositories/CommunityEventRepository";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { requireText } from "../../shared/validation/inputValidation";

export class ListCommunityEventRegistrationsUseCase {
  constructor(
    private readonly communityEventRepository: CommunityEventRepository,
    private readonly communityEventRegistrationRepository: CommunityEventRegistrationRepository
  ) {}

  async execute(communityEventId: string): Promise<CommunityEventRegistration[]> {
    const normalizedEventId = requireText(communityEventId, "El evento", 128);
    const communityEvent = await this.communityEventRepository.findById(normalizedEventId);

    if (!communityEvent) {
      throw new NotFoundError("El evento comunitario indicado no existe.");
    }

    return this.communityEventRegistrationRepository.findByEventId(normalizedEventId);
  }
}
