import { CommunityEvent } from "../../domain/entities/CommunityEvent";
import { CommunityEventRepository } from "../../domain/repositories/CommunityEventRepository";

export class ListCommunityEventsUseCase {
  constructor(private readonly communityEventRepository: CommunityEventRepository) {}

  async execute(): Promise<CommunityEvent[]> {
    return this.communityEventRepository.findAll();
  }
}
