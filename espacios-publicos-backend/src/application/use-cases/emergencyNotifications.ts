import { EmergencyImpactRecord } from "../../domain/entities/EmergencyImpact";
import { CommunityEventRegistrationRepository } from "../../domain/repositories/CommunityEventRegistrationRepository";
import { EmailSender } from "../../domain/services/EmailSender";
import { logger } from "../../shared/logging/logger";

const EMAIL_BATCH_SIZE = 20;

export type AttendeeSource = Pick<CommunityEventRegistrationRepository, "findByEventId">;
export type BookingNoun = "reserva" | "inscripción";

export interface EmergencyEmail {
  subject: string;
  message: string;
}

/** El texto cambia segun quien lo recibe: quien reservo o quien se inscribio al evento. */
export type EmergencyEmailBuilder = (noun: BookingNoun) => EmergencyEmail;

type NotifiableImpact = Pick<
  EmergencyImpactRecord,
  "organizerEmail" | "organizerName" | "emergenciaId" | "bookingId" | "bookingType" | "bookingLabel"
>;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
}

function frontendUrl(path: string): string {
  return `${(process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "")}${path}`;
}

function emailBody(name: string, label: string, message: string, url: string, linkText: string): string {
  return [
    `<p>Hola ${escapeHtml(name)}:</p>`,
    `<p><strong>${escapeHtml(label)}</strong></p>`,
    `<p>${escapeHtml(message)}</p>`,
    `<p><a href="${escapeHtml(url)}">${escapeHtml(linkText)}</a></p>`
  ].join("");
}

/** Un mail que falla no frena la emergencia: el aviso queda visible en el backoffice. */
async function notifyOrganizer(
  emailSender: EmailSender,
  impact: NotifiableImpact,
  build: EmergencyEmailBuilder
): Promise<void> {
  if (!impact.organizerEmail) {
    return;
  }

  const { subject, message } = build("reserva");
  const path = impact.bookingType === "RESERVATION"
    ? `/reservations/verify/${encodeURIComponent(impact.bookingId)}`
    : `/event/${encodeURIComponent(impact.bookingId)}`;

  try {
    await emailSender.send(
      impact.organizerEmail,
      subject,
      emailBody(impact.organizerName, impact.bookingLabel, message, frontendUrl(path), "Ver el detalle")
    );
  } catch (error) {
    logger.warn(
      { err: error, emergenciaId: impact.emergenciaId, bookingId: impact.bookingId },
      "CU-01: no se pudo avisar al organizador"
    );
  }
}

async function notifyAttendees(
  emailSender: EmailSender,
  attendees: AttendeeSource,
  impact: NotifiableImpact,
  build: EmergencyEmailBuilder
): Promise<void> {
  const { subject, message } = build("inscripción");

  try {
    const registrations = await attendees.findByEventId(impact.bookingId);

    // Un mail por persona, para no exponer las direcciones de los demas inscriptos.
    for (let index = 0; index < registrations.length; index += EMAIL_BATCH_SIZE) {
      const results = await Promise.allSettled(
        registrations.slice(index, index + EMAIL_BATCH_SIZE).map((registration) =>
          emailSender.send(
            registration.citizenEmail,
            subject,
            emailBody(registration.citizenName, impact.bookingLabel, message, frontendUrl("/reservations"), "Ver Mis Reservas")
          )
        )
      );
      const failed = results.filter((result) => result.status === "rejected").length;

      if (failed > 0) {
        logger.warn({ emergenciaId: impact.emergenciaId, bookingId: impact.bookingId, failed }, "CU-01: fallaron avisos a inscriptos");
      }
    }
  } catch (error) {
    logger.warn({ err: error, emergenciaId: impact.emergenciaId, bookingId: impact.bookingId }, "CU-01: no se pudo avisar a los inscriptos");
  }
}

/** Avisa al organizador y, si es un evento comunitario, a sus inscriptos. */
export async function notifyImpact(
  emailSender: EmailSender,
  attendees: AttendeeSource,
  impact: NotifiableImpact,
  build: EmergencyEmailBuilder
): Promise<void> {
  await notifyOrganizer(emailSender, impact, build);

  if (impact.bookingType === "COMMUNITY_EVENT") {
    await notifyAttendees(emailSender, attendees, impact, build);
  }
}
