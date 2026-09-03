import { randomUUID } from "crypto";
import { Reservation } from "../../domain/entities/Reservation";
import { DomainEvent } from "../../domain/entities/DomainEvent";
import { EventOutboxRepository } from "../../domain/repositories/EventOutboxRepository";
import { CommunityEventRepository } from "../../domain/repositories/CommunityEventRepository";
import { PublicSpaceRepository } from "../../domain/repositories/PublicSpaceRepository";
import { ReservationRepository } from "../../domain/repositories/ReservationRepository";
import { EventBus } from "../../domain/services/EventBus";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ValidationError } from "../../shared/errors/ValidationError";
import { RequestReservationInput } from "../dtos/RequestReservationInput";

export class RequestReservationUseCase {
  constructor(
    private readonly publicSpaceRepository: PublicSpaceRepository,
    private readonly reservationRepository: ReservationRepository,
    private readonly communityEventRepository: CommunityEventRepository,
    private readonly eventOutboxRepository: EventOutboxRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(input: RequestReservationInput): Promise<Reservation> {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (!input.publicSpaceId || !input.requesterName || !input.requesterEmail) {
      throw new ValidationError("Espacio, solicitante y email son obligatorios.");
    }

    if (!Number.isFinite(input.estimatedAttendees) || input.estimatedAttendees <= 0) {
      throw new ValidationError("La cantidad estimada de asistentes debe ser mayor a cero.");
    }

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new ValidationError("Las fechas de la reserva no son validas.");
    }

    if (startDate >= endDate) {
      throw new ValidationError("La fecha de inicio debe ser anterior a la fecha de fin.");
    }

    const publicSpace = await this.publicSpaceRepository.findById(input.publicSpaceId);

    if (!publicSpace) {
      throw new NotFoundError("El espacio publico indicado no existe.");
    }

    if (publicSpace.status !== "ENABLED") {
      throw new ValidationError("El espacio publico indicado no esta habilitado para nuevas reservas.");
    }

    if (input.estimatedAttendees > publicSpace.capacity) {
      throw new ValidationError("La cantidad de asistentes supera la capacidad del espacio.");
    }

    const overlappingReservations = await this.reservationRepository.findOverlapping(
      input.publicSpaceId,
      startDate,
      endDate
    );

    const reservedAttendees = overlappingReservations.reduce((total, reservation) => {
      return total + reservation.estimatedAttendees;
    }, 0);

    if (reservedAttendees + input.estimatedAttendees > publicSpace.capacity) {
      throw new ValidationError("El espacio no tiene cupo disponible para ese rango horario.");
    }

    const overlappingEvents = await this.communityEventRepository.findOverlapping(
      input.publicSpaceId,
      startDate,
      endDate
    );

    if (overlappingEvents.length > 0) {
      throw new ValidationError("El espacio esta bloqueado por un evento comunitario en ese horario.");
    }

    const reservation = await this.reservationRepository.create({
      publicSpaceId: input.publicSpaceId,
      requesterName: input.requesterName,
      requesterEmail: input.requesterEmail,
      estimatedAttendees: input.estimatedAttendees,
      startDate,
      endDate
    });

    const event: DomainEvent = {
      id: randomUUID(),
      name: "espacios.reserva_confirmada",
      payload: {
        reservationId: reservation.id,
        publicSpaceId: reservation.publicSpaceId,
        requesterEmail: reservation.requesterEmail,
        estimatedAttendees: reservation.estimatedAttendees,
        startDate: reservation.startDate.toISOString(),
        endDate: reservation.endDate.toISOString()
      },
      occurredAt: new Date()
    };

    // Outbox primero: si luego falla el broker, queda trazabilidad para reintentar.
    await this.eventOutboxRepository.save(event);
    await this.eventBus.publish(event);

    return reservation;
  }
}
