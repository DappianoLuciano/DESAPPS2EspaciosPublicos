import { randomUUID } from "crypto";
import { DomainEvent } from "../../domain/entities/DomainEvent";
import { PublicSpace } from "../../domain/entities/PublicSpace";
import { EventOutboxRepository } from "../../domain/repositories/EventOutboxRepository";
import { PublicSpaceRepository } from "../../domain/repositories/PublicSpaceRepository";
import { EventBus } from "../../domain/services/EventBus";
import { eventNames } from "../../shared/events/eventTypes";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ValidationError } from "../../shared/errors/ValidationError";
import { optionalCoordinates } from "../../shared/validation/coordinates";
import {
  optionalHttpsUrl,
  optionalText,
  requirePositiveInteger,
  requireText
} from "../../shared/validation/inputValidation";
import { UpdatePublicSpaceInput } from "../dtos/UpdatePublicSpaceInput";

export class UpdatePublicSpaceUseCase {
  // outbox y eventBus son opcionales para no romper a quien construye el caso
  // de uso solo con el repositorio (tests previos). Sin ellos no se publica.
  constructor(
    private readonly publicSpaceRepository: PublicSpaceRepository,
    private readonly eventOutboxRepository?: EventOutboxRepository,
    private readonly eventBus?: EventBus
  ) {}

  async execute(id: string, input: UpdatePublicSpaceInput): Promise<PublicSpace> {
    const publicSpaceId = requireText(id, "El espacio publico", 128);
    const publicSpace = await this.publicSpaceRepository.findById(publicSpaceId);

    if (!publicSpace) {
      throw new NotFoundError("El espacio publico indicado no existe.");
    }

    if (input.status && !["ENABLED", "DISABLED"].includes(input.status)) {
      throw new ValidationError("El estado del espacio publico no es valido.");
    }

    if (input.exposure && !["INDOOR", "OUTDOOR", "MIXED"].includes(input.exposure)) {
      throw new ValidationError("El tipo de exposicion del espacio publico no es valido.");
    }

    const updated = await this.publicSpaceRepository.update(publicSpaceId, {
      name: optionalText(input.name, "El nombre", 160),
      description: optionalText(input.description, "La descripcion", 5000),
      address: optionalText(input.address, "La direccion", 250),
      zone: optionalText(input.zone, "La zona", 120),
      capacity:
        input.capacity === undefined
          ? undefined
          : requirePositiveInteger(input.capacity, "La capacidad"),
      ...optionalCoordinates(input.latitude, input.longitude),
      status: input.status,
      exposure: input.exposure,
      imageUrl: optionalHttpsUrl(input.imageUrl)
    });

    // Solo interesa al resto de la ciudad cuando el espacio deja de recibir
    // gente o vuelve a recibirla: Movilidad lo saca o lo vuelve a poner como destino.
    if (input.status && input.status !== publicSpace.status) {
      await this.publishStatusChanged(updated);
    }

    return updated;
  }

  private async publishStatusChanged(publicSpace: PublicSpace): Promise<void> {
    if (!this.eventOutboxRepository || !this.eventBus) {
      return;
    }

    const occurredAt = new Date();
    const event: DomainEvent = {
      id: randomUUID(),
      name: eventNames.publicSpaceStatusChanged(),
      payload: {
        espacioId: publicSpace.id,
        estadoNuevo: publicSpace.status,
        zona: publicSpace.zone || null,
        latitud: publicSpace.latitude ?? null,
        longitud: publicSpace.longitude ?? null,
        cambiadoEn: occurredAt.toISOString()
      },
      occurredAt
    };

    await this.eventOutboxRepository.save(event);
    await this.eventBus.publish(event);
  }
}
