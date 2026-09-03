import { PublicSpace } from "../../domain/entities/PublicSpace";
import { PublicSpaceFilters, PublicSpaceRepository } from "../../domain/repositories/PublicSpaceRepository";

export class ListPublicSpacesUseCase {
  constructor(private readonly publicSpaceRepository: PublicSpaceRepository) {}

  async execute(filters?: PublicSpaceFilters): Promise<PublicSpace[]> {
    return this.publicSpaceRepository.findAll(filters);
  }
}
