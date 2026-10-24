import { Prisma, WeatherAlert as PrismaWeatherAlert } from "@prisma/client";
import { DomainEvent } from "../../domain/entities/DomainEvent";
import {
  CreateWeatherAlertData,
  WeatherAlert,
  WeatherAlertStatus,
  WeatherCriticality,
  WeatherEvidence
} from "../../domain/entities/WeatherAlert";
import { WeatherAlertRepository } from "../../domain/repositories/WeatherAlertRepository";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ValidationError } from "../../shared/errors/ValidationError";
import { prisma } from "./prismaClient";

export class PrismaWeatherAlertRepository implements WeatherAlertRepository {
  async create(data: CreateWeatherAlertData): Promise<WeatherAlert> {
    const alert = await prisma.weatherAlert.upsert({
      where: { deduplicationKey: data.deduplicationKey },
      update: {},
      create: {
        ...data,
        evidence: data.evidence as unknown as Prisma.InputJsonValue
      }
    });
    return this.map(alert);
  }

  async findByDeduplicationKey(key: string): Promise<WeatherAlert | null> {
    const alert = await prisma.weatherAlert.findUnique({ where: { deduplicationKey: key } });
    return alert ? this.map(alert) : null;
  }

  async findById(id: string): Promise<WeatherAlert | null> {
    const alert = await prisma.weatherAlert.findUnique({ where: { id } });
    return alert ? this.map(alert) : null;
  }

  async findMany(status?: WeatherAlertStatus): Promise<WeatherAlert[]> {
    const alerts = await prisma.weatherAlert.findMany({
      where: status ? { status } : undefined,
      orderBy: { detectedAt: "desc" }
    });
    return alerts.map((alert) => this.map(alert));
  }

  async findExpiredConfirmed(now: Date): Promise<WeatherAlert[]> {
    const alerts = await prisma.weatherAlert.findMany({
      where: { status: "CONFIRMED", validUntil: { lte: now } },
      orderBy: { validUntil: "asc" }
    });
    return alerts.map((alert) => this.map(alert));
  }

  async hasBlockingAlert(zone: string, startDate: Date, endDate: Date): Promise<boolean> {
    const coverageZone = process.env.WEATHER_ZONE?.trim() || "CABA";
    const count = await prisma.weatherAlert.count({
      where: {
        status: "CONFIRMED",
        confirmedCriticality: { in: ["ALTA", "CRITICA"] },
        validFrom: { lt: endDate },
        validUntil: { gt: startDate },
        zone: { in: Array.from(new Set([zone, coverageZone])) }
      }
    });
    return count > 0;
  }

  async confirmWithEvent(
    id: string,
    criticality: WeatherCriticality,
    validUntil: Date,
    actorSub: string,
    event: DomainEvent
  ): Promise<WeatherAlert> {
    return prisma.$transaction(async (transaction) => {
      const result = await transaction.weatherAlert.updateMany({
        where: { id, status: "PENDING" },
        data: {
          status: "CONFIRMED",
          confirmedCriticality: criticality,
          validUntil,
          confirmedAt: event.occurredAt,
          confirmedBy: actorSub
        }
      });

      if (result.count === 0) {
        const current = await transaction.weatherAlert.findUnique({ where: { id } });
        if (!current) throw new NotFoundError("La alerta climatica no existe.");
        throw new ValidationError("La alerta climatica ya fue procesada.");
      }

      await transaction.eventOutbox.create({
        data: {
          id: event.id,
          name: event.name,
          payload: event.payload as Prisma.InputJsonValue,
          occurredAt: event.occurredAt
        }
      });
      const updated = await transaction.weatherAlert.findUniqueOrThrow({ where: { id } });
      return this.map(updated);
    });
  }

  async dismiss(id: string, reason: string, actorSub: string): Promise<WeatherAlert> {
    const result = await prisma.weatherAlert.updateMany({
      where: { id, status: "PENDING" },
      data: {
        status: "DISMISSED",
        dismissalReason: reason,
        dismissedBy: actorSub,
        dismissedAt: new Date()
      }
    });
    if (result.count === 0) {
      await this.ensurePending(id);
    }
    const updated = await prisma.weatherAlert.findUniqueOrThrow({ where: { id } });
    return this.map(updated);
  }

  async finalizeWithEvent(id: string, actorSub: string, event: DomainEvent): Promise<WeatherAlert> {
    return prisma.$transaction(async (transaction) => {
      const result = await transaction.weatherAlert.updateMany({
        where: { id, status: "CONFIRMED" },
        data: {
          status: "FINALIZED",
          finalizedAt: event.occurredAt,
          finalizedBy: actorSub
        }
      });
      if (result.count === 0) {
        const current = await transaction.weatherAlert.findUnique({ where: { id } });
        if (!current) throw new NotFoundError("La alerta climatica no existe.");
        throw new ValidationError("Solo se puede finalizar una alerta confirmada.");
      }

      await transaction.eventOutbox.create({
        data: {
          id: event.id,
          name: event.name,
          payload: event.payload as Prisma.InputJsonValue,
          occurredAt: event.occurredAt
        }
      });
      const updated = await transaction.weatherAlert.findUniqueOrThrow({ where: { id } });
      return this.map(updated);
    });
  }

  private async ensurePending(id: string): Promise<never> {
    const current = await prisma.weatherAlert.findUnique({ where: { id } });
    if (!current) throw new NotFoundError("La alerta climatica no existe.");
    throw new ValidationError("La alerta climatica ya fue procesada.");
  }

  private map(alert: PrismaWeatherAlert): WeatherAlert {
    return {
      ...alert,
      evidence: alert.evidence as unknown as WeatherEvidence
    };
  }
}
