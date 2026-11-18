import { EmergencyImpactRecord } from "../../domain/entities/EmergencyImpact";
import { EmergencyImpactRepository } from "../../domain/repositories/EmergencyImpactRepository";
import { EmailSender } from "../../domain/services/EmailSender";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ValidationError } from "../../shared/errors/ValidationError";
import { nullableText, requireText } from "../../shared/validation/inputValidation";
import { CancelCommunityEventUseCase } from "./CancelCommunityEventUseCase";
import { AttendeeSource, notifyImpact, notifyWatchers, WatcherSource } from "./emergencyNotifications";

const CANCELABLE: readonly string[] = ["SUSPENDIDA", "EN_CURSO", "A_REPROGRAMAR", "REPROGRAMADA"];
const DEFAULT_REASON = "Cancelado por una emergencia cercana.";

export interface CancelAffectedEventInput {
  impactId: unknown;
  reason?: unknown;
  actorSub?: string | null;
}

/**
 * CU-01: el backoffice cancela un evento comunitario afectado por una emergencia. Usa la cancelacion de
 * siempre (publica EventoCancelado y ActividadModificada) y ademas avisa por mail al organizador, a los
 * inscriptos y a quienes pidieron enterarse. Las reservas de espacio no tienen cancelacion: se reprograman.
 */
export class CancelAffectedEventUseCase {
  constructor(
    private readonly impacts: Pick<EmergencyImpactRepository, "findImpactById" | "cancelImpact">,
    private readonly cancelCommunityEvent: Pick<CancelCommunityEventUseCase, "execute">,
    private readonly emailSender: EmailSender,
    private readonly attendees: AttendeeSource,
    private readonly watchers?: WatcherSource
  ) {}

  async execute(input: CancelAffectedEventInput): Promise<EmergencyImpactRecord> {
    const impactId = requireText(input.impactId, "La reserva afectada", 128);
    const reason = (typeof input.reason === "string" && input.reason.trim()
      ? nullableText(input.reason, "El motivo de la cancelacion", 500)
      : null) ?? DEFAULT_REASON;
    const impact = await this.impacts.findImpactById(impactId);

    if (!impact) {
      throw new NotFoundError("La reserva afectada indicada no existe.");
    }

    if (impact.bookingType !== "COMMUNITY_EVENT") {
      throw new ValidationError("Las reservas de espacio no se cancelan desde aca: se pueden reprogramar.");
    }

    if (!CANCELABLE.includes(impact.status)) {
      throw new ValidationError(impact.status === "CANCELADA"
        ? "El evento ya fue cancelado."
        : "La emergencia ya se resolvió y el evento quedó confirmado.");
    }

    await this.cancelCommunityEvent.execute(impact.bookingId, reason, { actorSub: input.actorSub ?? null });
    const cancelled = await this.impacts.cancelImpact(impact.id, new Date());

    await notifyImpact(this.emailSender, this.attendees, cancelled, () => ({
      subject: "El evento fue cancelado por una emergencia cercana",
      message: `El evento se canceló. Motivo: ${reason}`
    }));
    await notifyWatchers(this.emailSender, this.watchers, cancelled, {
      subject: "El evento fue cancelado",
      message: `El evento se canceló por una emergencia cercana. Motivo: ${reason}`
    });

    return cancelled;
  }
}
