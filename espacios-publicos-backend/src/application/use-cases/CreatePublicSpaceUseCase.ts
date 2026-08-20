import { PublicSpace } from "../../domain/entities/PublicSpace";
import { PublicSpaceRepository } from "../../domain/repositories/PublicSpaceRepository";
import { ValidationError } from "../../shared/errors/ValidationError";
import { CreatePublicSpaceInput } from "../dtos/CreatePublicSpaceInput";

export class CreatePublicSpaceUseCase {
  constructor(private readonly publicSpaceRepository: PublicSpaceRepository) {}

  async execute(input: CreatePublicSpaceInput): Promise<PublicSpace> {
    if (!input.name || !input.description || !input.address) {
      throw new ValidationError("Nombre, descripcion y direccion son obligatorios.");
    }

    if (!Number.isFinite(input.capacity) || input.capacity <= 0) {
      throw new ValidationError("La capacidad debe ser un numero mayor a cero.");
    }

    return this.publicSpaceRepository.create(input);
  }
}
