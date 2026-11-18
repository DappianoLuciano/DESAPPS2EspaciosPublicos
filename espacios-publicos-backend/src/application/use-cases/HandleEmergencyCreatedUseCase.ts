import { CreateEmergencyImpactData, EmergencyImpactInitialStatus } from "../../domain/entities/EmergencyImpact";
import { EmergencyImpactRepository } from "../../domain/repositories/EmergencyImpactRepository";
import { EmailSender } from "../../domain/services/EmailSender";
import { EventBus } from "../../domain/services/EventBus";
import { logger } from "../../shared/logging/logger";
import { buildReservationAffectedEvent } from "../events/emergencyEventBuilders";
import { EmergencyCreated } from "../events/emergencyEvents";
import { FindNearbyBookingsUseCase, NearbySpaceBookings } from "./FindNearbyBookingsUseCase";
import { AttendeeSource, EmergencyEmailBuilder, notifyImpact } from "./emergencyNotifications";

const DEFAULT_WINDOW_HOURS = 2;

export function emergencyWindowHours(): number {
  const configured = Number(process.env.EMERGENCY_WINDOW_HOURS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_WINDOW_HOURS;
}

function toImpacts(emergenciaId: string, { space, reservations, events }: NearbySpaceBookings): CreateEmergencyImpactData[] {
  return [
    ...reservations.map((reservation): CreateEmergencyImpactData => ({
      emergenciaId,
      bookingType: "RESERVATION",
      bookingId: reservation.id,
      publicSpaceId: space.id,
      bookingLabel: `Reserva en ${space.name}`,
      startDate: reservation.startDate,
      endDate: reservation.endDate,
      organizerName: reservation.requesterName,
      organizerEmail: reservation.requesterEmail
    })),
    ...events.map((event): CreateEmergencyImpactData => ({
      emergenciaId,
      bookingType: "COMMUNITY_EVENT",
      bookingId: event.id,
      publicSpaceId: space.id,
      bookingLabel: `${event.title}, ${space.name}`,
      startDate: event.startDate,
      endDate: event.endDate,
      organizerName: event.organizerName,
      organizerEmail: process.env.EMERGENCY_NOTIFICATIONS_EMAIL?.trim() || null
    }))
  ];
}

const CREATED_MESSAGES: Record<EmergencyImpactInitialStatus, EmergencyEmailBuilder> = {
  SUSPENDIDA: (noun) => ({
    subject: `Tu ${noun} fue suspendida por una emergencia cercana`,
    message: `Hubo una emergencia cerca del espacio y suspendimos tu ${noun}. Te avisamos cuando se resuelva.`
  }),
  // Ya hay gente en el lugar: Espacios no puede frenar el evento, lo decide el backoffice.
  EN_CURSO: () => ({
    subject: "Emergencia durante el desarrollo del evento",
    message: "Se presentó una emergencia en las cercanías durante el desarrollo del evento. Podría suspenderse; te avisamos por mail cualquier novedad."
  })
};

/** La emergencia agarro la reserva ya empezada: no se suspende, queda en curso hasta que el backoffice decida. */
export function initialStatus(startDate: Date, occurredAt: Date): EmergencyImpactInitialStatus {
  return startDate <= occurredAt ? "EN_CURSO" : "SUSPENDIDA";
}

/** CU-01 A10. Devuelve true si la emergencia quedo procesada, aunque no afecte ninguna reserva. */
export class HandleEmergencyCreatedUseCase {
  constructor(
    private readonly impacts: Pick<EmergencyImpactRepository, "findCase" | "saveCase" | "createImpact">,
    private readonly findNearbyBookings: Pick<FindNearbyBookingsUseCase, "execute">,
    private readonly eventBus: EventBus,
    private readonly emailSender: EmailSender,
    private readonly attendees: AttendeeSource
  ) {}

  async execute(emergency: EmergencyCreated): Promise<boolean> {
    const known = await this.impacts.findCase(emergency.emergenciaId);

    // Entrega desordenada: si ya se resolvio, suspender ahora dejaria la reserva sin liberar.
    if (known?.resolvedAt) {
      return true;
    }

    if (emergency.latitude === null && !emergency.zone) {
      logger.warn({ emergenciaId: emergency.emergenciaId }, "CU-01: emergencia sin ubicacion; no se revisan reservas");
      return false;
    }

    await this.impacts.saveCase({ ...emergency, resolvedAt: null });

    // Hacia atras solo cuenta lo que sigue en curso: una reserva terminada no se puede suspender.
    const until = new Date(emergency.occurredAt.getTime() + emergencyWindowHours() * 3_600_000);
    const nearby = await this.findNearbyBookings.execute(emergency, emergency.occurredAt, until);

    for (const impact of nearby.flatMap((space) => toImpacts(emergency.emergenciaId, space))) {
      const status = initialStatus(impact.startDate, emergency.occurredAt);
      const event = buildReservationAffectedEvent({ ...impact, action: status, occurredAt: new Date() });

      if (await this.impacts.createImpact(impact, event, status)) {
        await this.eventBus.publish(event);
        await notifyImpact(this.emailSender, this.attendees, impact, CREATED_MESSAGES[status]);
      }
    }

    return true;
  }
}
