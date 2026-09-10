import { PublicSpace } from "../../domain/entities/PublicSpace";
import { PublicSpaceRepository } from "../../domain/repositories/PublicSpaceRepository";
import { ValidationError } from "../../shared/errors/ValidationError";
import {
  optionalHttpsUrl,
  optionalText,
  requirePositiveInteger,
  requireText
} from "../../shared/validation/inputValidation";
import { CreatePublicSpaceInput } from "../dtos/CreatePublicSpaceInput";

export class CreatePublicSpaceUseCase {
  constructor(private readonly publicSpaceRepository: PublicSpaceRepository) {}

  async execute(input: CreatePublicSpaceInput): Promise<PublicSpace> {
    const name = requireText(input.name, "El nombre", 160);
    const description = requireText(input.description, "La descripcion", 5000);
    const address = requireText(input.address, "La direccion", 250);
    const zone = optionalText(input.zone, "La zona", 120);
    const capacity = requirePositiveInteger(input.capacity, "La capacidad");
    const imageUrl = optionalHttpsUrl(input.imageUrl);

    if (input.status && !["ENABLED", "DISABLED"].includes(input.status)) {
      throw new ValidationError("El estado del espacio publico no es valido.");
    }

    return this.publicSpaceRepository.create({
      name,
      description,
      address,
      zone,
      capacity,
      status: input.status,
      imageUrl
    });
  }
}
