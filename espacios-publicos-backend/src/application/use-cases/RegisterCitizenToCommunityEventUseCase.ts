import { randomUUID } from "crypto";
import { CommunityEventRegistration } from "../../domain/entities/CommunityEventRegistration";
import { DomainEvent } from "../../domain/entities/DomainEvent";
import { CommunityEventRegistrationRepository } from "../../domain/repositories/CommunityEventRegistrationRepository";
import { CommunityEventRepository } from "../../domain/repositories/CommunityEventRepository";
import { EventOutboxRepository } from "../../domain/repositories/EventOutboxRepository";
import { EventBus } from "../../domain/services/EventBus";
import { EmailSender } from "../../domain/services/EmailSender";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ValidationError } from "../../shared/errors/ValidationError";
import { requireEmail, requireText } from "../../shared/validation/inputValidation";
import { RegisterCitizenToCommunityEventInput } from "../dtos/RegisterCitizenToCommunityEventInput";

export class RegisterCitizenToCommunityEventUseCase {
  constructor(
    private readonly communityEventRepository: CommunityEventRepository,
    private readonly communityEventRegistrationRepository: CommunityEventRegistrationRepository,
    private readonly eventOutboxRepository: EventOutboxRepository,
    private readonly eventBus: EventBus,
    private readonly emailSender: EmailSender
  ) {}

  async execute(input: RegisterCitizenToCommunityEventInput): Promise<CommunityEventRegistration> {
    const communityEventId = requireText(input.communityEventId, "El evento", 128);
    const citizenName = requireText(input.citizenName, "El nombre del ciudadano", 120);
    const citizenEmail = requireEmail(input.citizenEmail);

    const communityEvent = await this.communityEventRepository.findById(communityEventId);

    if (!communityEvent) {
      throw new NotFoundError("El evento comunitario indicado no existe.");
    }

    if (communityEvent.status !== "ACTIVE") {
      throw new ValidationError("El evento no esta abierto a inscripciones.");
    }

    if (!communityEvent.requiresRegistration) {
      throw new ValidationError("El evento es de libre acceso y no requiere inscripcion previa.");
    }

    if (communityEvent.startDate.getTime() <= Date.now()) {
      throw new ValidationError("La inscripcion cerro porque el evento ya comenzo.");
    }

    const existingRegistration =
      await this.communityEventRegistrationRepository.findByEventAndCitizenEmail(
        communityEventId,
        citizenEmail
      );

    if (existingRegistration) {
      throw new ValidationError("El ciudadano ya se encuentra inscripto a este evento.");
    }

    const currentRegistrations = await this.communityEventRegistrationRepository.countByEventId(
      communityEventId
    );

    if (currentRegistrations >= communityEvent.capacity) {
      await this.communityEventRepository.updateStatus(communityEvent.id, "ACTIVE_FULL");
      throw new ValidationError("El evento no tiene cupos disponibles.");
    }

    const registration = await this.communityEventRegistrationRepository.create({
      communityEventId,
      citizenName,
      citizenEmail
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

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const eventUrl = `${frontendUrl}/event/${communityEvent.id}`;
    const eventDate = communityEvent.startDate.toLocaleString("es-AR", {
      dateStyle: "full",
      timeStyle: "short"
    });

    const emailHtml = `
      <h1>Inscripción Confirmada</h1>
      <p>Hola ${registration.citizenName},</p>
      <p>Tu lugar para <strong>${communityEvent.title}</strong> quedó reservado.</p>
      <p>Fecha: ${eventDate}</p>
      <p>Más detalles del evento: <a href="${eventUrl}">${eventUrl}</a></p>
    `;

    await this.emailSender.send(
      registration.citizenEmail,
      `Inscripción Confirmada - ${communityEvent.title}`,
      emailHtml
    );

    return registration;
  }
}
