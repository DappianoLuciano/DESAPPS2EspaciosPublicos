import { randomUUID } from "crypto";
import { CommunityEventRegistration } from "../../domain/entities/CommunityEventRegistration";
import { DomainEvent } from "../../domain/entities/DomainEvent";
import { CommunityEventRegistrationRepository } from "../../domain/repositories/CommunityEventRegistrationRepository";
import { CommunityEventRepository } from "../../domain/repositories/CommunityEventRepository";
import { EventOutboxRepository } from "../../domain/repositories/EventOutboxRepository";
import { EventBus } from "../../domain/services/EventBus";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ValidationError } from "../../shared/errors/ValidationError";
import { RegisterCitizenToCommunityEventInput } from "../dtos/RegisterCitizenToCommunityEventInput";

export class RegisterCitizenToCommunityEventUseCase {
  constructor(
    private readonly communityEventRepository: CommunityEventRepository,
    private readonly communityEventRegistrationRepository: CommunityEventRegistrationRepository,
    private readonly eventOutboxRepository: EventOutboxRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(input: RegisterCitizenToCommunityEventInput): Promise<CommunityEventRegistration> {
    if (!input.communityEventId || !input.citizenName || !input.citizenEmail) {
      throw new ValidationError("Evento, nombre y email del ciudadano son obligatorios.");
    }

    const communityEvent = await this.communityEventRepository.findById(input.communityEventId);

    if (!communityEvent) {
      throw new NotFoundError("El evento comunitario indicado no existe.");
    }

    if (communityEvent.status !== "ACTIVE") {
      throw new ValidationError("El evento no esta abierto a inscripciones.");
    }

    if (!communityEvent.requiresRegistration) {
      throw new ValidationError("El evento es de libre acceso y no requiere inscripcion previa.");
    }

    const existingRegistration =
      await this.communityEventRegistrationRepository.findByEventAndCitizenEmail(
        input.communityEventId,
        input.citizenEmail
      );

    if (existingRegistration) {
      throw new ValidationError("El ciudadano ya se encuentra inscripto a este evento.");
    }

    const currentRegistrations = await this.communityEventRegistrationRepository.countByEventId(
      input.communityEventId
    );

    if (currentRegistrations >= communityEvent.capacity) {
      await this.communityEventRepository.updateStatus(communityEvent.id, "ACTIVE_FULL");
      throw new ValidationError("El evento no tiene cupos disponibles.");
    }

    const registration = await this.communityEventRegistrationRepository.create({
      communityEventId: input.communityEventId,
      citizenName: input.citizenName,
      citizenEmail: input.citizenEmail
    });

    const remainingCapacity = communityEvent.capacity - (currentRegistrations + 1);

    if (remainingCapacity === 0) {
      await this.communityEventRepository.updateStatus(communityEvent.id, "ACTIVE_FULL");
    }

    const event: DomainEvent = {
      id: randomUUID(),
      name: "cultura.ciudadano_inscripto",
      payload: {
        registrationId: registration.id,
        communityEventId: registration.communityEventId,
        citizenEmail: registration.citizenEmail,
        remainingCapacity
      },
      occurredAt: new Date()
    };

    await this.eventOutboxRepository.save(event);
    await this.eventBus.publish(event);

    return registration;
  }
}
