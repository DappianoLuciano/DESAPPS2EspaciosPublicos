import { randomUUID } from "crypto";
import { CommunityEvent } from "../../domain/entities/CommunityEvent";
import { DomainEvent } from "../../domain/entities/DomainEvent";
import { CommunityEventRepository } from "../../domain/repositories/CommunityEventRepository";
import { EventOutboxRepository } from "../../domain/repositories/EventOutboxRepository";
import { PublicSpaceRepository } from "../../domain/repositories/PublicSpaceRepository";
import { ReservationRepository } from "../../domain/repositories/ReservationRepository";
import { EventBus } from "../../domain/services/EventBus";
import { ForbiddenError } from "../../shared/errors/ForbiddenError";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ValidationError } from "../../shared/errors/ValidationError";
import {
  normalizeStringList,
  optionalHttpsUrl,
  requirePositiveInteger,
  requireText
} from "../../shared/validation/inputValidation";
import { CreateCommunityEventInput } from "../dtos/CreateCommunityEventInput";

export class CreateCommunityEventUseCase {
  constructor(
    private readonly publicSpaceRepository: PublicSpaceRepository,
    private readonly reservationRepository: ReservationRepository,
    private readonly communityEventRepository: CommunityEventRepository,
    private readonly eventOutboxRepository: EventOutboxRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(input: CreateCommunityEventInput): Promise<CommunityEvent> {
    const title = requireText(input.title, "El titulo", 160);
    const description = requireText(input.description, "La descripcion", 5000);
    const publicSpaceId = requireText(input.publicSpaceId, "El espacio publico", 128);
    const category = requireText(input.category, "La categoria", 80);
    const organizerName = requireText(input.organizerName, "El organizador", 120);
    const startDate = new Date(requireText(input.startDate, "La fecha de inicio", 64));
    const endDate = new Date(requireText(input.endDate, "La fecha de fin", 64));
    const capacity = requirePositiveInteger(input.capacity, "El cupo del evento");
    const tags = normalizeStringList(input.tags, "Las etiquetas", 20, 60);
    const requirements = normalizeStringList(input.requirements, "Los requisitos", 20, 240);
    const imageUrl = optionalHttpsUrl(input.imageUrl);

    if (input.organizerProfileEnabled !== true) {
      throw new ForbiddenError("El organizador no cuenta con perfil habilitado para publicar eventos.");
    }

    if (typeof input.requiresRegistration !== "boolean") {
      throw new ValidationError("Debe indicar si el evento requiere inscripcion previa.");
    }

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new ValidationError("Las fechas del evento no son validas.");
    }

    if (startDate >= endDate) {
      throw new ValidationError("La fecha de inicio debe ser anterior a la fecha de fin.");
    }

    if (startDate.getTime() < Date.now()) {
      throw new ValidationError("El evento no puede comenzar en una fecha u horario pasado.");
    }

    const publicSpace = await this.publicSpaceRepository.findById(publicSpaceId);

    if (!publicSpace) {
      throw new NotFoundError("El espacio publico indicado no existe.");
    }

    if (publicSpace.status !== "ENABLED") {
      throw new ValidationError("El espacio publico indicado no esta habilitado para nuevos eventos.");
    }

    if (capacity > publicSpace.capacity) {
      throw new ValidationError("El cupo del evento supera la capacidad del espacio.");
    }

    const overlappingReservations = await this.reservationRepository.findOverlapping(
      publicSpaceId,
      startDate,
      endDate
    );

    if (overlappingReservations.length > 0) {
      throw new ValidationError("El espacio tiene reservas confirmadas en ese horario.");
    }

    const overlappingEvents = await this.communityEventRepository.findOverlapping(
      publicSpaceId,
      startDate,
      endDate
    );

    if (overlappingEvents.length > 0) {
      throw new ValidationError("El espacio ya tiene un evento comunitario activo en ese horario.");
    }

    const communityEvent = await this.communityEventRepository.create({
      title,
      category,
      tags,
      description,
      requirements,
      publicSpaceId,
      organizerName,
      capacity,
      requiresRegistration: input.requiresRegistration,
      startDate,
      endDate,
      imageUrl
    });

    const event: DomainEvent = {
      id: randomUUID(),
      name: "cultura.evento_comunitario_publicado",
      payload: {
        communityEventId: communityEvent.id,
        publicSpaceId: communityEvent.publicSpaceId,
        title: communityEvent.title,
        category: communityEvent.category,
        tags: communityEvent.tags,
        organizerName: communityEvent.organizerName,
        status: communityEvent.status,
        capacity: communityEvent.capacity,
        requiresRegistration: communityEvent.requiresRegistration,
        startDate: communityEvent.startDate.toISOString(),
        endDate: communityEvent.endDate.toISOString(),
        imageUrl: communityEvent.imageUrl || null
      },
      occurredAt: new Date()
    };

    await this.eventOutboxRepository.save(event);
    await this.eventBus.publish(event);

    return communityEvent;
  }
}
