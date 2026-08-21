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
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (!input.title || !input.description || !input.publicSpaceId) {
      throw new ValidationError("Titulo, descripcion y espacio publico son obligatorios.");
    }

    if (!input.category || !input.organizerName) {
      throw new ValidationError("Categoria y organizador son obligatorios.");
    }

    if (input.organizerProfileEnabled !== true) {
      throw new ForbiddenError("El organizador no cuenta con perfil habilitado para publicar eventos.");
    }

    if (!Number.isFinite(input.capacity) || input.capacity <= 0) {
      throw new ValidationError("El cupo del evento debe ser mayor a cero.");
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

    const publicSpace = await this.publicSpaceRepository.findById(input.publicSpaceId);

    if (!publicSpace) {
      throw new NotFoundError("El espacio publico indicado no existe.");
    }

    if (input.capacity > publicSpace.capacity) {
      throw new ValidationError("El cupo del evento supera la capacidad del espacio.");
    }

    const overlappingReservations = await this.reservationRepository.findOverlapping(
      input.publicSpaceId,
      startDate,
      endDate
    );

    if (overlappingReservations.length > 0) {
      throw new ValidationError("El espacio tiene reservas confirmadas en ese horario.");
    }

    const overlappingEvents = await this.communityEventRepository.findOverlapping(
      input.publicSpaceId,
      startDate,
      endDate
    );

    if (overlappingEvents.length > 0) {
      throw new ValidationError("El espacio ya tiene un evento comunitario activo en ese horario.");
    }

    const communityEvent = await this.communityEventRepository.create({
      title: input.title,
      category: input.category,
      description: input.description,
      publicSpaceId: input.publicSpaceId,
      organizerName: input.organizerName,
      capacity: input.capacity,
      requiresRegistration: input.requiresRegistration,
      startDate,
      endDate,
      imageUrl: input.imageUrl
    });

    const event: DomainEvent = {
      id: randomUUID(),
      name: "cultura.evento_comunitario_publicado",
      payload: {
        communityEventId: communityEvent.id,
        publicSpaceId: communityEvent.publicSpaceId,
        title: communityEvent.title,
        category: communityEvent.category,
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
