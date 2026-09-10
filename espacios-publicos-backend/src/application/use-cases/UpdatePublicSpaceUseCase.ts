import { PublicSpace } from "../../domain/entities/PublicSpace";
import { PublicSpaceRepository } from "../../domain/repositories/PublicSpaceRepository";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ValidationError } from "../../shared/errors/ValidationError";
import {
  optionalHttpsUrl,
  optionalText,
  requirePositiveInteger,
  requireText
} from "../../shared/validation/inputValidation";
import { UpdatePublicSpaceInput } from "../dtos/UpdatePublicSpaceInput";

export class UpdatePublicSpaceUseCase {
  constructor(private readonly publicSpaceRepository: PublicSpaceRepository) {}

  async execute(id: string, input: UpdatePublicSpaceInput): Promise<PublicSpace> {
    const publicSpaceId = requireText(id, "El espacio publico", 128);
    const publicSpace = await this.publicSpaceRepository.findById(publicSpaceId);

    if (!publicSpace) {
      throw new NotFoundError("El espacio publico indicado no existe.");
    }

    if (input.status && !["ENABLED", "DISABLED"].includes(input.status)) {
      throw new ValidationError("El estado del espacio publico no es valido.");
    }

    return this.publicSpaceRepository.update(publicSpaceId, {
      name: optionalText(input.name, "El nombre", 160),
      description: optionalText(input.description, "La descripcion", 5000),
      address: optionalText(input.address, "La direccion", 250),
      zone: optionalText(input.zone, "La zona", 120),
      capacity:
        input.capacity === undefined
          ? undefined
          : requirePositiveInteger(input.capacity, "La capacidad"),
      status: input.status,
      imageUrl: optionalHttpsUrl(input.imageUrl)
    });
  }
}
