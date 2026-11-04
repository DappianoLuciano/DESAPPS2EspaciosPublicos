import { EmergencyImpactRecord } from "../../domain/entities/EmergencyImpact";
import { CommunityEventRegistrationRepository } from "../../domain/repositories/CommunityEventRegistrationRepository";
import { EmailSender } from "../../domain/services/EmailSender";
import { logger } from "../../shared/logging/logger";

const EMAIL_BATCH_SIZE = 20;

export type AttendeeSource = Pick<CommunityEventRegistrationRepository, "findByEventId">;

type NotifiableImpact = Pick<
  EmergencyImpactRecord,
  "organizerEmail" | "organizerName" | "emergenciaId" | "bookingId" | "bookingType"
>;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
}

/** Un mail que falla no frena la emergencia: el aviso queda visible en el backoffice. */
export async function notifyOrganizer(
  emailSender: EmailSender,
  impact: Pick<EmergencyImpactRecord, "organizerEmail" | "organizerName" | "emergenciaId" | "bookingId">,
  subject: string,
  message: string
): Promise<void> {
  if (!impact.organizerEmail) {
    return;
  }

  try {
    await emailSender.send(
      impact.organizerEmail,
      subject,
      `<p>Hola ${escapeHtml(impact.organizerName)}:</p><p>${escapeHtml(message)}</p>`
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
  subject: string,
  message: string
): Promise<void> {
  try {
    const registrations = await attendees.findByEventId(impact.bookingId);

    // Un mail por persona, para no exponer las direcciones de los demas inscriptos.
    for (let index = 0; index < registrations.length; index += EMAIL_BATCH_SIZE) {
      const results = await Promise.allSettled(
        registrations.slice(index, index + EMAIL_BATCH_SIZE).map((registration) =>
          emailSender.send(
            registration.citizenEmail,
            subject,
            `<p>Hola ${escapeHtml(registration.citizenName)}:</p><p>${escapeHtml(message)}</p>`
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
  subject: string,
  message: string
): Promise<void> {
  await notifyOrganizer(emailSender, impact, subject, message);

  if (impact.bookingType === "COMMUNITY_EVENT") {
    await notifyAttendees(emailSender, attendees, impact, subject, message);
  }
}
