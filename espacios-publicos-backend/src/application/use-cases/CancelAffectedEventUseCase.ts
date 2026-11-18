import { EmergencyImpactRecord } from "../../domain/entities/EmergencyImpact";
import { EmergencyImpactRepository } from "../../domain/repositories/EmergencyImpactRepository";
import { EmailSender } from "../../domain/services/EmailSender";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ValidationError } from "../../shared/errors/ValidationError";
import { nullableText, requireText } from "../../shared/validation/inputValidation";
import { CancelCommunityEventUseCase } from "./CancelCommunityEventUseCase";
import { AttendeeSource, notifyImpact, notifyWatchers, WatcherSource } from "./emergencyNotifications";

const CANCELABLE: readonly string[] = ["SUSPENDIDA", "EN_CURSO", "REPROGRAMADA"];
const DEFAULT_REASON = "Cancelado por una emergencia cercana.";
const DEFAULT_DISMISS_REASON = "No se pudo hacer por una emergencia cercana y no se va a reprogramar.";

function optionalReason(value: unknown, fallback: string): string {
  return (typeof value === "string" && value.trim()
    ? nullableText(value, "El motivo", 500)
    : null) ?? fallback;
}

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
    const reason = optionalReason(input.reason, DEFAULT_REASON);
    const impact = await this.impacts.findImpactById(impactId);

    if (!impact) {
      throw new NotFoundError("La reserva afectada indicada no existe.");
    }

    if (impact.bookingType !== "COMMUNITY_EVENT") {
      throw new ValidationError("Las reservas de espacio no se cancelan desde aca: se pueden reprogramar.");
    }

    if (!CANCELABLE.includes(impact.status)) {
      throw new ValidationError(
        impact.status === "CANCELADA" ? "El evento ya fue cancelado."
          : impact.status === "A_REPROGRAMAR" ? "El horario ya pasó: reprogramalo o dalo de baja."
            : "La emergencia ya se resolvió y el evento quedó confirmado."
      );
    }

    if (impact.endDate.getTime() <= Date.now()) {
      throw new ValidationError("El evento ya terminó y no puede cancelarse.");
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

  /**
   * CU-01: cierra sin reprogramar algo que quedo "A reprogramar" (el horario paso durante la emergencia).
   * Un evento comunitario se cancela con la cancelacion de siempre, aunque ya haya terminado, para que
   * Analitica sepa que no se hizo. Una reserva de espacio no tiene cancelacion: solo se cierra la afectacion.
   */
  async dismiss(input: CancelAffectedEventInput): Promise<EmergencyImpactRecord> {
    const impactId = requireText(input.impactId, "La reserva afectada", 128);
    const reason = optionalReason(input.reason, DEFAULT_DISMISS_REASON);
    const impact = await this.impacts.findImpactById(impactId);

    if (!impact) {
      throw new NotFoundError("La reserva afectada indicada no existe.");
    }

    if (impact.status !== "A_REPROGRAMAR") {
      throw new ValidationError("Solo se puede dar de baja lo que quedó pendiente de reprogramar.");
    }

    if (impact.bookingType === "COMMUNITY_EVENT") {
      await this.cancelCommunityEvent.execute(impact.bookingId, reason, {
        actorSub: input.actorSub ?? null,
        allowEnded: true
      });
    }

    const dismissed = await this.impacts.cancelImpact(impact.id, new Date());

    await notifyImpact(this.emailSender, this.attendees, dismissed, (noun) => ({
      subject: `Tu ${noun} no se va a reprogramar`,
      message: `Por la emergencia cercana el horario ya había pasado y se decidió no reprogramarla. Motivo: ${reason}`
    }));
    await notifyWatchers(this.emailSender, this.watchers, dismissed, {
      subject: "El evento no se va a reprogramar",
      message: `El evento no se pudo hacer por una emergencia cercana y no se va a reprogramar. Motivo: ${reason}`
    });

    return dismissed;
  }
}
