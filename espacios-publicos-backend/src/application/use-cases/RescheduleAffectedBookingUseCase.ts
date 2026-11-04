import { EmergencyImpactRecord } from "../../domain/entities/EmergencyImpact";
import { CommunityEventRegistrationRepository } from "../../domain/repositories/CommunityEventRegistrationRepository";
import { CommunityEventRepository } from "../../domain/repositories/CommunityEventRepository";
import { EmergencyImpactRepository } from "../../domain/repositories/EmergencyImpactRepository";
import { EventOutboxRepository } from "../../domain/repositories/EventOutboxRepository";
import { PublicSpaceRepository } from "../../domain/repositories/PublicSpaceRepository";
import { ReservationRepository } from "../../domain/repositories/ReservationRepository";
import { EmailSender } from "../../domain/services/EmailSender";
import { EventBus } from "../../domain/services/EventBus";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ValidationError } from "../../shared/errors/ValidationError";
import { requireText } from "../../shared/validation/inputValidation";
import { buildCommunityEventPublishedEvent } from "../events/communityEventPublished";
import { buildReservationAffectedEvent } from "../events/emergencyEventBuilders";
import { notifyOrganizer } from "./emergencyNotifications";

const REPROGRAMMABLE: readonly string[] = ["SUSPENDIDA", "A_REPROGRAMAR", "REPROGRAMADA"];

function formatLocalDate(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Argentina/Buenos_Aires"
  }).format(date);
}

export interface RescheduleBookingInput {
  impactId: unknown;
  startDate: unknown;
  endDate: unknown;
  actor: string;
}

export class RescheduleAffectedBookingUseCase {
  constructor(
    private readonly impacts: Pick<EmergencyImpactRepository, "findImpactById" | "rescheduleBooking">,
    private readonly publicSpaceRepository: Pick<PublicSpaceRepository, "findById">,
    private readonly reservationRepository: Pick<ReservationRepository, "findById" | "findOverlapping">,
    private readonly communityEventRepository: Pick<CommunityEventRepository, "findById" | "findOverlapping">,
    private readonly registrations: Pick<CommunityEventRegistrationRepository, "countByEventId">,
    private readonly eventBus: EventBus,
    private readonly eventOutboxRepository: EventOutboxRepository,
    private readonly emailSender: EmailSender
  ) {}

  async execute(input: RescheduleBookingInput): Promise<EmergencyImpactRecord> {
    const impactId = requireText(input.impactId, "La reserva afectada", 128);
    const startDate = new Date(requireText(input.startDate, "La fecha de inicio", 64));
    const endDate = new Date(requireText(input.endDate, "La fecha de fin", 64));

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new ValidationError("Las fechas no son validas.");
    }

    if (startDate >= endDate) {
      throw new ValidationError("La fecha de inicio debe ser anterior a la fecha de fin.");
    }

    if (startDate.getTime() < Date.now()) {
      throw new ValidationError("No se puede reprogramar a una fecha pasada.");
    }

    const impact = await this.impacts.findImpactById(impactId);

    if (!impact) {
      throw new NotFoundError("La reserva afectada indicada no existe.");
    }

    if (!REPROGRAMMABLE.includes(impact.status)) {
      throw new ValidationError("La reserva ya fue confirmada y no se puede reprogramar desde aca.");
    }

    await this.assertAvailable(impact, startDate, endDate);

    const event = buildReservationAffectedEvent({
      ...impact,
      startDate,
      endDate,
      action: "REPROGRAMADA",
      occurredAt: new Date()
    });
    const updated = await this.impacts.rescheduleBooking({ impact, startDate, endDate, actor: input.actor }, event);

    await this.eventBus.publish(event);
    await this.republishEvent(impact);
    await notifyOrganizer(
      this.emailSender,
      updated,
      "Tu reserva fue reprogramada",
      `El nuevo horario es del ${formatLocalDate(startDate)} al ${formatLocalDate(endDate)}.`
    );

    return updated;
  }

  private async assertAvailable(impact: EmergencyImpactRecord, startDate: Date, endDate: Date): Promise<void> {
    const { publicSpaceId, bookingId, bookingType } = impact;
    const reservations = (await this.reservationRepository.findOverlapping(publicSpaceId, startDate, endDate))
      .filter((reservation) => reservation.id !== bookingId);
    const events = (await this.communityEventRepository.findOverlapping(publicSpaceId, startDate, endDate))
      .filter((event) => event.id !== bookingId);

    if (events.length > 0) {
      throw new ValidationError("El espacio tiene un evento comunitario en ese horario.");
    }

    if (bookingType === "COMMUNITY_EVENT") {
      if (reservations.length > 0) {
        throw new ValidationError("El espacio tiene reservas confirmadas en ese horario.");
      }
      return;
    }

    const reservation = await this.reservationRepository.findById(bookingId);
    const space = await this.publicSpaceRepository.findById(publicSpaceId);

    if (!reservation || !space) {
      throw new NotFoundError("La reserva o el espacio ya no existen.");
    }

    const taken = reservations.reduce((total, item) => total + item.estimatedAttendees, 0);

    if (taken + reservation.estimatedAttendees > space.capacity) {
      throw new ValidationError("El espacio no tiene cupo disponible para ese horario.");
    }
  }

  // Residuos y Movilidad se quedan con la ultima publicacion del evento.
  private async republishEvent(impact: EmergencyImpactRecord): Promise<void> {
    if (impact.bookingType !== "COMMUNITY_EVENT") {
      return;
    }

    const communityEvent = await this.communityEventRepository.findById(impact.bookingId);

    if (!communityEvent) {
      return;
    }

    const space = await this.publicSpaceRepository.findById(impact.publicSpaceId);
    const inscriptos = await this.registrations.countByEventId(communityEvent.id);
    const event = buildCommunityEventPublishedEvent(communityEvent, space, inscriptos);

    await this.eventOutboxRepository.save(event);
    await this.eventBus.publish(event);
  }
}
