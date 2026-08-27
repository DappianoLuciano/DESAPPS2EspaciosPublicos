import { PublicSpaceRepository } from "../../domain/repositories/PublicSpaceRepository";
import { NotFoundError } from "../../shared/errors/NotFoundError";

export class DeletePublicSpaceUseCase {
  constructor(private readonly publicSpaceRepository: PublicSpaceRepository) {}

  async execute(id: string): Promise<void> {
    const publicSpace = await this.publicSpaceRepository.findById(id);

    if (!publicSpace) {
      throw new NotFoundError("El espacio publico indicado no existe.");
    }

    await this.publicSpaceRepository.delete(id);
  }
}
