import { EmergencyImpactRecord, EmergencyLocation } from "../../domain/entities/EmergencyImpact";
import { EmergencyImpactRepository, ImpactRelease } from "../../domain/repositories/EmergencyImpactRepository";
import { EmailSender } from "../../domain/services/EmailSender";
import { EventBus } from "../../domain/services/EventBus";
import { buildSpaceReleasedEvent } from "../events/emergencyEventBuilders";
import { EmergencyResolved } from "../events/emergencyEvents";
import { AttendeeSource, notifyImpact } from "./emergencyNotifications";

function releaseStatus(impact: EmergencyImpactRecord, now: Date): ImpactRelease["status"] {
  if (impact.status === "REPROGRAMADA") {
    return "REPROGRAMADA";
  }

  // Si el horario paso durante la emergencia no se puede confirmar: lo reprograma el backoffice.
  return impact.endDate > now ? "CONFIRMADA" : "A_REPROGRAMAR";
}

const RELEASE_MESSAGES: Record<ImpactRelease["status"], (noun: string) => string> = {
  CONFIRMADA: (noun) => `La emergencia se resolvió y tu ${noun} quedó confirmada en el horario original.`,
  REPROGRAMADA: (noun) => `La emergencia se resolvió y tu ${noun} sigue en el nuevo horario.`,
  A_REPROGRAMAR: () => "La emergencia se resolvió, pero el horario ya pasó. Vamos a contactarte para reprogramarla."
};

/**
 * CU-01: libera lo afectado (A10). Espacios no registra ni deriva problematicas del espacio publico:
 * eso le corresponde a otro modulo (Reclamos).
 */
export class HandleEmergencyResolvedUseCase {
  constructor(
    private readonly impacts: Pick<
      EmergencyImpactRepository,
      "findCase" | "resolveCase" | "findUnreleased" | "releaseImpacts"
    >,
    private readonly eventBus: EventBus,
    private readonly emailSender: EmailSender,
    private readonly attendees: AttendeeSource
  ) {}

  async execute(emergency: EmergencyResolved): Promise<boolean> {
    const now = new Date();
    const known = await this.impacts.findCase(emergency.emergenciaId);
    const location = this.pickLocation(emergency, known);

    await this.impacts.resolveCase({
      emergenciaId: emergency.emergenciaId,
      ...location,
      occurredAt: known?.occurredAt ?? now,
      resolvedAt: known?.resolvedAt ?? now
    });

    await this.releaseSpaces(emergency.emergenciaId, now);

    return true;
  }

  private pickLocation(emergency: EmergencyResolved, known: EmergencyLocation | null): EmergencyLocation {
    return emergency.latitude !== null || emergency.zone || !known
      ? { latitude: emergency.latitude, longitude: emergency.longitude, zone: emergency.zone }
      : { latitude: known.latitude, longitude: known.longitude, zone: known.zone };
  }

  private async releaseSpaces(emergenciaId: string, now: Date): Promise<void> {
    const unreleased = await this.impacts.findUnreleased(emergenciaId);
    const bySpace = new Map<string, EmergencyImpactRecord[]>();

    for (const impact of unreleased) {
      bySpace.set(impact.publicSpaceId, [...(bySpace.get(impact.publicSpaceId) ?? []), impact]);
    }

    for (const [publicSpaceId, spaceImpacts] of bySpace) {
      const releases = spaceImpacts.map((impact) => ({ id: impact.id, status: releaseStatus(impact, now) }));
      const withStatus = (status: ImpactRelease["status"]) =>
        spaceImpacts.filter((_, index) => releases[index].status === status).map((impact) => impact.bookingId);
      const event = buildSpaceReleasedEvent({
        emergenciaId,
        publicSpaceId,
        confirmed: withStatus("CONFIRMADA"),
        rescheduled: withStatus("REPROGRAMADA"),
        occurredAt: now
      });

      await this.impacts.releaseImpacts(releases, now, event);
      await this.eventBus.publish(event);

      for (const [index, impact] of spaceImpacts.entries()) {
        await notifyImpact(
          this.emailSender,
          this.attendees,
          impact,
          (noun) => ({
            subject: `Novedades de tu ${noun}`,
            message: RELEASE_MESSAGES[releases[index].status](noun)
          })
        );
      }
    }
  }
}
