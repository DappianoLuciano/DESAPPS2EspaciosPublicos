import { RequestReservationData, Reservation } from "../../domain/entities/Reservation";
import { ReservationRepository } from "../../domain/repositories/ReservationRepository";
import { prisma } from "./prismaClient";

export class PrismaReservationRepository implements ReservationRepository {
  async create(data: RequestReservationData): Promise<Reservation> {
    return prisma.reservation.create({ data });
  }

  async findAll(): Promise<Reservation[]> {
    return prisma.reservation.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findOverlapping(publicSpaceId: string, startDate: Date, endDate: Date): Promise<Reservation[]> {
    return prisma.reservation.findMany({
      where: {
        publicSpaceId,
        status: {
          equals: "CONFIRMED"
        },
        startDate: {
          lt: endDate
        },
        endDate: {
          gt: startDate
        }
      }
    });
  }
}
