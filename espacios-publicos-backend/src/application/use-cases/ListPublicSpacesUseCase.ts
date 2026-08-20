import { PublicSpace } from "../../domain/entities/PublicSpace";
import { PublicSpaceRepository } from "../../domain/repositories/PublicSpaceRepository";

export class ListPublicSpacesUseCase {
  constructor(private readonly publicSpaceRepository: PublicSpaceRepository) {}

  async execute(): Promise<PublicSpace[]> {
    return this.publicSpaceRepository.findAll();
  }
}
