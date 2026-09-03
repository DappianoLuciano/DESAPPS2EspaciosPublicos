import { CommunityEventCatalogItem } from "../../domain/entities/CommunityEventCatalogItem";
import { CommunityEventRepository } from "../../domain/repositories/CommunityEventRepository";
import { NotFoundError } from "../../shared/errors/NotFoundError";

export class GetCommunityEventUseCase {
  constructor(private readonly communityEventRepository: CommunityEventRepository) {}

  async execute(id: string): Promise<CommunityEventCatalogItem> {
    const communityEvent = await this.communityEventRepository.findActiveCatalogById(id);

    if (!communityEvent) {
      throw new NotFoundError("El evento comunitario indicado no existe.");
    }

    return communityEvent;
  }
}
