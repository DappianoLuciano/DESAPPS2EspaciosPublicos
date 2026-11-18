import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { WeatherRestrictionRepository } from "../../domain/repositories/WeatherRestrictionRepository";
import { WeatherAlert } from "../../domain/entities/WeatherAlert";
import { weatherImpactCandidates } from "../../domain/services/weatherImpact";
import { AppError } from "../../shared/errors/AppError";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ValidationError } from "../../shared/errors/ValidationError";
import { requireText } from "../../shared/validation/inputValidation";
import { prisma } from "./prismaClient";
import { PublicSpaceAffectation, PublicSpaceAffectedPublisher } from "../../application/events/publicSpaceAffected";
import { CommunityEventSnapshotPublisher } from "../../application/events/communityEventPublished";
import { buildActivityModifiedEvent, weatherAlertCause } from "../../application/events/activityModified";
import { DomainEvent } from "../../domain/entities/DomainEvent";
import { EventBus } from "../../domain/services/EventBus";

export class PrismaWeatherRestrictionRepository implements WeatherRestrictionRepository {
  // Opcionales: sin publicadores las medidas se aplican igual, pero no se avisa a Analitica
  // (EspacioPublicoAfectado) ni a Movilidad (snapshot de los eventos suspendidos o reanudados).
  // ActividadModificada se guarda en el outbox dentro de la transaccion y se publica en el bus
  // despues del commit; sin bus queda PENDING y la publica el worker del outbox (solo respaldo).
  constructor(
    private readonly affectedPublisher?: PublicSpaceAffectedPublisher,
    private readonly snapshots?: CommunityEventSnapshotPublisher,
    private readonly eventBus?: EventBus
  ) {}

  private async saveInOutbox(tx: Prisma.TransactionClient, events: DomainEvent[]) {
    for (const event of events) {
      await tx.eventOutbox.create({ data: {
        id: event.id, name: event.name, payload: event.payload as Prisma.InputJsonValue, occurredAt: event.occurredAt
      } });
    }
  }

  private async publishAfterCommit(events: DomainEvent[]) {
    for (const event of events) await this.eventBus?.publish(event);
  }

  async hasBlockingRestriction(publicSpaceId: string, start: Date, end: Date) {
    return (await prisma.weatherRestriction.count({ where: {
      publicSpaceId, releasedAt: null, validFrom: { lt: end }, validUntil: { gt: start }
    } })) > 0;
  }

  private async load(tx: Prisma.TransactionClient, id: string) {
    const alert = await tx.weatherAlert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundError("La alerta climática no existe.");
    const [spaces, events, restrictions] = await Promise.all([
      tx.publicSpace.findMany({ orderBy: { name: "asc" } }),
      tx.communityEvent.findMany({ where: { endDate: { gt: new Date() }, status: { not: "CANCELLED" } },
        include: { weatherRestrictions: { where: { releasedAt: null } } }, orderBy: { startDate: "asc" } }),
      tx.weatherRestriction.findMany({ where: { alertId: id, releasedAt: null }, include: { publicSpace: true, communityEvent: true } })
    ]);
    const candidates = weatherImpactCandidates(alert as unknown as WeatherAlert, spaces, events);
    return { alert, candidates, restrictions };
  }

  async preview(id: string) {
    const { alert, candidates, restrictions } = await prisma.$transaction(tx => this.load(tx, requireText(id, "La alerta", 128)));
    return {
      alertId: alert.id, status: alert.status, validFrom: alert.validFrom, validUntil: alert.validUntil,
      neighborhoods: candidates.neighborhoods,
      canApply: alert.status === "CONFIRMED" && alert.validUntil > new Date(),
      activeSpaceCount: restrictions.filter(row => row.publicSpaceId).length,
      activeEventCount: restrictions.filter(row => row.communityEventId).length,
      // Incluye medidas previas aunque el espacio haya sido inhabilitado o el evento cancelado después.
      appliedSpaces: restrictions.filter(row => row.publicSpaceId).map(row => ({ id: row.publicSpaceId!, name: row.publicSpace!.name })),
      appliedEvents: restrictions.filter(row => row.communityEventId).map(row => ({ id: row.communityEventId!, title: row.communityEvent!.title })),
      spaces: candidates.spaces.map(space => ({
        id: space.id, name: space.name, zone: space.zone, exposure: space.exposure,
        restricted: restrictions.some(row => row.publicSpaceId === space.id),
        events: candidates.events.filter(event => event.publicSpaceId === space.id).map(event => ({
          id: event.id, title: event.title, startDate: event.startDate, endDate: event.endDate, status: event.status,
          restricted: restrictions.some(row => row.communityEventId === event.id),
          selectable: event.status === "ACTIVE" || event.status === "ACTIVE_FULL" ||
            (event.status === "SUSPENDED" && !!event.weatherRestrictions?.length)
        }))
      }))
    };
  }

  private async transaction<T>(run: (tx: Prisma.TransactionClient) => Promise<T>) {
    try { return await prisma.$transaction(run, { isolationLevel: "Serializable" }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code)) {
        throw new AppError("Los datos cambiaron durante la revisión. Volvé a abrir las medidas y reintentá.", 409);
      }
      throw error;
    }
  }

  async apply(id: string, input: { spaceIds?: unknown; eventIds?: unknown; reason?: unknown }, actor: string) {
    const alertId = requireText(id, "La alerta", 128);
    const appliedBy = requireText(actor, "El administrador", 128);
    const reason = requireText(input.reason, "El motivo", 500);
    const parseIds = (value: unknown): string[] => {
      if (!Array.isArray(value) || value.length > 500) throw new ValidationError("La selección no es válida (máximo 500 elementos).");
      return [...new Set(value.map(id => requireText(id, "El identificador", 128)))];
    };
    const spaceIds = parseIds(input.spaceIds);
    const eventIds = parseIds(input.eventIds);
    if (!spaceIds.length && !eventIds.length) throw new ValidationError("Seleccioná al menos un espacio o evento.");
    const { affectations, suspendedEventIds, activityEvents } = await this.transaction(async tx => {
      const { alert, candidates, restrictions } = await this.load(tx, alertId);
      if (alert.status !== "CONFIRMED" || alert.validUntil <= new Date()) throw new ValidationError("Solo se aplican medidas a una alerta confirmada con vigencia pendiente.");
      if (spaceIds.some(id => !candidates.spaces.some(space => space.id === id)) ||
        eventIds.some(id => !candidates.events.some(event => event.id === id &&
          (event.status !== "SUSPENDED" || !!event.weatherRestrictions?.length)))) {
        throw new ValidationError("La selección cambió o contiene actividades fuera del alcance de esta alerta. Actualizá la revisión.");
      }
      const common = { alertId, validFrom: alert.validFrom, validUntil: alert.validUntil, reason, appliedBy };
      // Solo los espacios que no tenian ya una medida activa de esta alerta generan una afectacion nueva.
      const newSpaceRestrictions = spaceIds
        .filter(publicSpaceId => !restrictions.some(row => row.publicSpaceId === publicSpaceId))
        .map(publicSpaceId => ({ id: randomUUID(), ...common, publicSpaceId }));
      await tx.weatherRestriction.createMany({ data: [
        ...newSpaceRestrictions,
        ...eventIds.map(communityEventId => ({ id: randomUUID(), ...common, communityEventId }))
      ], skipDuplicates: true });
      await tx.communityEvent.updateMany({ where: { id: { in: eventIds }, status: { in: ["ACTIVE", "ACTIVE_FULL"] } },
        data: { status: "SUSPENDED", statusReason: reason } });
      // Solo cambian de estado los que estaban activos; los ya suspendidos no se republican.
      const suspendedEvents = candidates.events
        .filter((event): event is typeof event & { status: "ACTIVE" | "ACTIVE_FULL" } =>
          eventIds.includes(event.id) && (event.status === "ACTIVE" || event.status === "ACTIVE_FULL"));
      const suspendedEventIds = suspendedEvents.map(event => event.id);
      const suspendedAt = new Date();
      const activityEvents = suspendedEvents.map(event => buildActivityModifiedEvent({
        activityId: event.id, previousStatus: event.status, newStatus: "SUSPENDED",
        reason, cause: weatherAlertCause(alertId), modifiedAt: suspendedAt, actorSub: appliedBy
      }));
      await this.saveInOutbox(tx, activityEvents);
      const affectations = newSpaceRestrictions.map((row): PublicSpaceAffectation => ({
        afectacionId: row.id,
        space: candidates.spaces.find(space => space.id === row.publicSpaceId)!,
        tipoAfectacion: "ACCESO_RESTRINGIDO",
        desde: row.validFrom,
        hastaEstimada: row.validUntil,
        causaId: alertId,
        causaTipo: "EVENTO_CLIMATICO"
      }));
      return { affectations, suspendedEventIds, activityEvents };
    });
    await this.affectedPublisher?.publish(affectations);
    await this.snapshots?.publish(suspendedEventIds);
    await this.publishAfterCommit(activityEvents);
    return this.preview(alertId);
  }

  async release(id: string, actor: string) {
    const alertId = requireText(id, "La alerta", 128);
    const releasedBy = requireText(actor, "El administrador", 128);
    const { resumedEventIds, releasedSpaceRestrictionIds, activityEvents } = await this.transaction(async tx => {
      const resumed: string[] = [];
      const activityEvents: DomainEvent[] = [];
      const resumedAt = new Date();
      const alert = await tx.weatherAlert.findUnique({ where: { id: alertId } });
      if (!alert) throw new NotFoundError("La alerta climática no existe.");
      if (alert.status !== "FINALIZED") throw new ValidationError("Finalizá la alerta antes de levantar sus medidas.");
      const links = await tx.weatherRestriction.findMany({ where: { alertId, releasedAt: null } });
      await tx.weatherRestriction.updateMany({ where: { alertId, releasedAt: null }, data: { releasedAt: new Date(), releasedBy } });
      for (const eventId of [...new Set(links.flatMap(row => row.communityEventId ? [row.communityEventId] : []))]) {
        const event = await tx.communityEvent.findUnique({ where: { id: eventId },
          include: { publicSpace: { select: { status: true } }, weatherRestrictions: { where: { releasedAt: null }, orderBy: { appliedAt: "asc" } }, _count: { select: { registrations: true } } } });
        // Una cancelación definitiva no se revierte; otra alerta sigue suspendiendo.
        if (!event || event.status !== "SUSPENDED") continue;
        if (event.weatherRestrictions.length) {
          await tx.communityEvent.update({ where: { id: eventId }, data: { statusReason: event.weatherRestrictions[0].reason } });
        } else if (event.publicSpace.status === "DISABLED") {
          await tx.communityEvent.update({ where: { id: eventId }, data: { statusReason: "Espacio deshabilitado. Pendiente de revisión administrativa." } });
        } else if (event.endDate > new Date()) {
          const status = event.requiresRegistration && event._count.registrations >= event.capacity ? "ACTIVE_FULL" : "ACTIVE";
          await tx.communityEvent.update({ where: { id: eventId }, data: { status, statusReason: null } });
          resumed.push(eventId);
          activityEvents.push(buildActivityModifiedEvent({
            activityId: eventId, previousStatus: event.status, newStatus: status,
            reason: null, cause: weatherAlertCause(alertId), modifiedAt: resumedAt, actorSub: releasedBy
          }));
        }
      }
      await this.saveInOutbox(tx, activityEvents);
      return {
        resumedEventIds: resumed,
        releasedSpaceRestrictionIds: links.filter(row => row.publicSpaceId).map(row => row.id),
        activityEvents
      };
    });
    // El afectacionId de una medida climatica es el id de la restriccion del espacio.
    if (releasedSpaceRestrictionIds.length) {
      await this.affectedPublisher?.restore({ afectacionIds: releasedSpaceRestrictionIds });
    }
    await this.snapshots?.publish(resumedEventIds);
    await this.publishAfterCommit(activityEvents);
    return this.preview(alertId);
  }
}
