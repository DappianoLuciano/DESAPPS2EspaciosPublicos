import { CommunityEvent, CreateCommunityEventData } from "../../domain/entities/CommunityEvent";
import { CommunityEventRepository } from "../../domain/repositories/CommunityEventRepository";
import { prisma } from "./prismaClient";

export class PrismaCommunityEventRepository implements CommunityEventRepository {
  async create(data: CreateCommunityEventData): Promise<CommunityEvent> {
    return prisma.communityEvent.create({ data });
  }

  async findAll(): Promise<CommunityEvent[]> {
    return prisma.communityEvent.findMany({ orderBy: { startDate: "asc" } });
  }

  async findOverlapping(publicSpaceId: string, startDate: Date, endDate: Date): Promise<CommunityEvent[]> {
    return prisma.communityEvent.findMany({
      where: {
        publicSpaceId,
        status: {
          in: ["ACTIVE", "ACTIVE_FULL"]
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
