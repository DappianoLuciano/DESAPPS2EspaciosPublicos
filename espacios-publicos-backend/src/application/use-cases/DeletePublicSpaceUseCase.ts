import { PublicSpaceRepository } from "../../domain/repositories/PublicSpaceRepository";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { requireText } from "../../shared/validation/inputValidation";

export class DeletePublicSpaceUseCase {
  constructor(private readonly publicSpaceRepository: PublicSpaceRepository) {}

  async execute(id: string): Promise<void> {
    const publicSpaceId = requireText(id, "El espacio publico", 128);
    const publicSpace = await this.publicSpaceRepository.findById(publicSpaceId);

    if (!publicSpace) {
      throw new NotFoundError("El espacio publico indicado no existe.");
    }

    await this.publicSpaceRepository.delete(publicSpaceId);
  }
}
