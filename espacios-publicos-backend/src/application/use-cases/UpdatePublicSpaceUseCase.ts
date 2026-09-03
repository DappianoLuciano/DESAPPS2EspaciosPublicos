import { PublicSpace } from "../../domain/entities/PublicSpace";
import { PublicSpaceRepository } from "../../domain/repositories/PublicSpaceRepository";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ValidationError } from "../../shared/errors/ValidationError";
import { UpdatePublicSpaceInput } from "../dtos/UpdatePublicSpaceInput";

export class UpdatePublicSpaceUseCase {
  constructor(private readonly publicSpaceRepository: PublicSpaceRepository) {}

  async execute(id: string, input: UpdatePublicSpaceInput): Promise<PublicSpace> {
    const publicSpace = await this.publicSpaceRepository.findById(id);

    if (!publicSpace) {
      throw new NotFoundError("El espacio publico indicado no existe.");
    }

    if (input.capacity !== undefined && (!Number.isFinite(input.capacity) || input.capacity <= 0)) {
      throw new ValidationError("La capacidad debe ser un numero mayor a cero.");
    }

    if (input.status && !["ENABLED", "DISABLED"].includes(input.status)) {
      throw new ValidationError("El estado del espacio publico no es valido.");
    }

    return this.publicSpaceRepository.update(id, input);
  }
}
