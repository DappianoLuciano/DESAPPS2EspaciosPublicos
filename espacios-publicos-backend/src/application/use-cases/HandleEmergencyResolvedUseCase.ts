import { randomUUID } from "crypto";
import { EmergencyImpactRecord, EmergencyLocation } from "../../domain/entities/EmergencyImpact";
import { PublicSpace } from "../../domain/entities/PublicSpace";
import { EmergencyImpactRepository, ImpactRelease } from "../../domain/repositories/EmergencyImpactRepository";
import { PublicSpaceRepository } from "../../domain/repositories/PublicSpaceRepository";
import { EmailSender } from "../../domain/services/EmailSender";
import { EventBus } from "../../domain/services/EventBus";
import { buildProblemRegisteredEvent, buildSpaceReleasedEvent } from "../events/emergencyEventBuilders";
import { EmergencyResolved } from "../events/emergencyEvents";
import { nearbySpaces } from "./FindNearbyBookingsUseCase";
import { notifyOrganizer } from "./emergencyNotifications";

const PUBLIC_SPACE_CAUSE = "ESPACIO_PUBLICO";
const UNCLASSIFIED_PROBLEM = "SIN_CLASIFICAR";

function releaseStatus(impact: EmergencyImpactRecord, now: Date): ImpactRelease["status"] {
  if (impact.status === "REPROGRAMADA") {
    return "REPROGRAMADA";
  }

  // Si el horario paso durante la emergencia no se puede confirmar: lo reprograma el backoffice.
  return impact.endDate > now ? "CONFIRMADA" : "A_REPROGRAMAR";
}

const RELEASE_MESSAGES: Record<ImpactRelease["status"], string> = {
  CONFIRMADA: "La emergencia se resolvio y tu reserva quedo confirmada en el horario original.",
  REPROGRAMADA: "La emergencia se resolvio y tu reserva sigue en el nuevo horario.",
  A_REPROGRAMAR: "La emergencia se resolvio, pero el horario ya paso. Vamos a contactarte para reprogramarla."
};

/** CU-01: libera lo afectado (A10) y, si la causa es el espacio publico, registra la problematica (A6). */
export class HandleEmergencyResolvedUseCase {
  constructor(
    private readonly impacts: Pick<
      EmergencyImpactRepository,
      "findCase" | "resolveCase" | "findUnreleased" | "releaseImpacts" | "createProblem"
    >,
    private readonly publicSpaceRepository: Pick<PublicSpaceRepository, "findAll">,
    private readonly eventBus: EventBus,
    private readonly emailSender: EmailSender
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

    if (emergency.causes.includes(PUBLIC_SPACE_CAUSE)) {
      await this.registerProblem(emergency, location, now);
    }

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
        await notifyOrganizer(
          this.emailSender,
          impact,
          "Novedades de tu reserva",
          RELEASE_MESSAGES[releases[index].status]
        );
      }
    }
  }

  private async registerProblem(emergency: EmergencyResolved, location: EmergencyLocation, now: Date): Promise<void> {
    const spaces: PublicSpace[] = await this.publicSpaceRepository.findAll();
    const publicSpaceId = nearbySpaces(spaces, location)[0]?.space.id ?? null;
    const problemId = randomUUID();
    const type = emergency.problemType ?? UNCLASSIFIED_PROBLEM;
    const event = buildProblemRegisteredEvent({
      emergenciaId: emergency.emergenciaId,
      problemId,
      publicSpaceId,
      type,
      latitude: location.latitude,
      longitude: location.longitude,
      occurredAt: now
    });
    const created = await this.impacts.createProblem(
      {
        id: problemId,
        emergenciaId: emergency.emergenciaId,
        publicSpaceId,
        type,
        latitude: location.latitude,
        longitude: location.longitude
      },
      event
    );

    if (created) {
      await this.eventBus.publish(event);
    }
  }
}
