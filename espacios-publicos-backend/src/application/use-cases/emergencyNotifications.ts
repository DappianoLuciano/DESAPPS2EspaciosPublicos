import { EmergencyImpactRecord } from "../../domain/entities/EmergencyImpact";
import { EmailSender } from "../../domain/services/EmailSender";
import { logger } from "../../shared/logging/logger";

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
