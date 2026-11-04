import { EmergencyBookingImpact, Prisma, PublicSpaceProblem } from "@prisma/client";
import { DomainEvent } from "../../domain/entities/DomainEvent";
import {
  CreateEmergencyImpactData,
  CreateSpaceProblemData,
  EmergencyBookingType,
  EmergencyCaseRecord,
  EmergencyEventNotice,
  EmergencyImpactRecord,
  EmergencyImpactStatus,
  EmergencyImpactSummary,
  SpaceProblemRecord,
  SpaceProblemStatus
} from "../../domain/entities/EmergencyImpact";
import {
  BookingReschedule,
  EmergencyImpactRepository,
  ImpactRelease
} from "../../domain/repositories/EmergencyImpactRepository";
import { prisma } from "./prismaClient";

const UNIQUE_VIOLATION = "P2002";

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION;
}

function outboxRow(event: DomainEvent): Prisma.EventOutboxCreateInput {
  return {
    id: event.id,
    name: event.name,
    payload: event.payload as Prisma.InputJsonValue,
    occurredAt: event.occurredAt
  };
}

function toImpact(row: EmergencyBookingImpact): EmergencyImpactRecord {
  return {
    ...row,
    bookingType: row.bookingType as EmergencyBookingType,
    status: row.status as EmergencyImpactStatus
  };
}

function toProblem(row: PublicSpaceProblem): SpaceProblemRecord {
  return { ...row, status: row.status as SpaceProblemStatus };
}

export class PrismaEmergencyImpactRepository implements EmergencyImpactRepository {
  async findCase(emergenciaId: string): Promise<EmergencyCaseRecord | null> {
    return prisma.emergencyCase.findUnique({ where: { emergenciaId } });
  }

  async saveCase(emergency: EmergencyCaseRecord): Promise<void> {
    const { emergenciaId, latitude, longitude, zone, occurredAt } = emergency;

    await prisma.emergencyCase.upsert({
      where: { emergenciaId },
      create: { emergenciaId, latitude, longitude, zone, occurredAt },
      update: {}
    });
  }

  async resolveCase(emergency: EmergencyCaseRecord): Promise<void> {
    const { emergenciaId, latitude, longitude, zone, occurredAt, resolvedAt } = emergency;

    await prisma.emergencyCase.upsert({
      where: { emergenciaId },
      create: { emergenciaId, latitude, longitude, zone, occurredAt, resolvedAt },
      update: { resolvedAt }
    });
  }

  async createImpact(data: CreateEmergencyImpactData, event: DomainEvent): Promise<boolean> {
    try {
      await prisma.$transaction([
        prisma.emergencyBookingImpact.create({ data: { ...data, status: "SUSPENDIDA" } }),
        prisma.eventOutbox.create({ data: outboxRow(event) })
      ]);
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) {
        return false;
      }
      throw error;
    }
  }

  async findUnreleased(emergenciaId: string): Promise<EmergencyImpactRecord[]> {
    const rows = await prisma.emergencyBookingImpact.findMany({ where: { emergenciaId, releasedAt: null } });
    return rows.map(toImpact);
  }

  async releaseImpacts(releases: ImpactRelease[], releasedAt: Date, event: DomainEvent): Promise<void> {
    await prisma.$transaction([
      ...releases.map(({ id, status }) =>
        prisma.emergencyBookingImpact.update({ where: { id }, data: { status, releasedAt } })
      ),
      prisma.eventOutbox.create({ data: outboxRow(event) })
    ]);
  }

  async findImpactById(id: string): Promise<EmergencyImpactRecord | null> {
    const row = await prisma.emergencyBookingImpact.findUnique({ where: { id } });
    return row ? toImpact(row) : null;
  }

  async rescheduleBooking(change: BookingReschedule, event: DomainEvent): Promise<EmergencyImpactRecord> {
    const { impact, startDate, endDate, actor } = change;
    const dates = { startDate, endDate };
    const [, row] = await prisma.$transaction([
      impact.bookingType === "RESERVATION"
        ? prisma.reservation.update({ where: { id: impact.bookingId }, data: dates })
        : prisma.communityEvent.update({ where: { id: impact.bookingId }, data: dates }),
      prisma.emergencyBookingImpact.update({
        where: { id: impact.id },
        data: { ...dates, status: "REPROGRAMADA", rescheduledBy: actor, rescheduledAt: new Date() }
      }),
      prisma.eventOutbox.create({ data: outboxRow(event) })
    ]);

    return toImpact(row);
  }

  async createProblem(data: CreateSpaceProblemData, event: DomainEvent): Promise<boolean> {
    try {
      await prisma.$transaction([
        prisma.publicSpaceProblem.create({ data }),
        prisma.eventOutbox.create({ data: outboxRow(event) })
      ]);
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) {
        return false;
      }
      throw error;
    }
  }

  async findProblemById(id: string): Promise<SpaceProblemRecord | null> {
    const row = await prisma.publicSpaceProblem.findUnique({ where: { id } });
    return row ? toProblem(row) : null;
  }

  async deriveProblem(id: string, derivedTo: string, derivedBy: string, derivedAt: Date): Promise<SpaceProblemRecord> {
    const row = await prisma.publicSpaceProblem.update({
      where: { id },
      data: { status: "DERIVADA", derivedTo, derivedBy, derivedAt }
    });

    return toProblem(row);
  }

  async listImpacts(): Promise<EmergencyImpactRecord[]> {
    const rows = await prisma.emergencyBookingImpact.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    return rows.map(toImpact);
  }

  async listProblems(): Promise<SpaceProblemRecord[]> {
    const rows = await prisma.publicSpaceProblem.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    return rows.map(toProblem);
  }

  async listEventNotices(now: Date): Promise<EmergencyEventNotice[]> {
    const rows = await prisma.emergencyBookingImpact.findMany({
      where: {
        bookingType: "COMMUNITY_EVENT",
        OR: [
          { status: "SUSPENDIDA", releasedAt: null },
          { status: "A_REPROGRAMAR" },
          { status: "REPROGRAMADA", endDate: { gt: now } }
        ]
      },
      orderBy: { createdAt: "desc" }
    });

    return rows.map((row) => ({
      eventId: row.bookingId,
      status: row.status as EmergencyImpactStatus,
      startDate: row.startDate,
      endDate: row.endDate
    }));
  }

  async getSummary(): Promise<EmergencyImpactSummary> {
    const [reservations, affectedBookings, released, problems] = await Promise.all([
      prisma.reservation.count({ where: { status: "CONFIRMED" } }),
      prisma.emergencyBookingImpact.count(),
      prisma.emergencyBookingImpact.findMany({
        where: { releasedAt: { not: null } },
        distinct: ["emergenciaId", "publicSpaceId"],
        select: { id: true }
      }),
      prisma.publicSpaceProblem.count()
    ]);

    return { reservations, affectedBookings, releasedSpaces: released.length, problems };
  }
}
