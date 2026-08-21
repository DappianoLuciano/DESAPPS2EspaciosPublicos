import {
  CommunityEvent,
  CommunityEventStatus,
  CreateCommunityEventData
} from "../../domain/entities/CommunityEvent";
import { CommunityEventCatalogItem } from "../../domain/entities/CommunityEventCatalogItem";
import {
  CommunityEventCatalogFilters,
  CommunityEventRepository
} from "../../domain/repositories/CommunityEventRepository";
import { prisma } from "./prismaClient";

export class PrismaCommunityEventRepository implements CommunityEventRepository {
  async create(data: CreateCommunityEventData): Promise<CommunityEvent> {
    return prisma.communityEvent.create({ data });
  }

  async findById(id: string): Promise<CommunityEvent | null> {
    return prisma.communityEvent.findUnique({ where: { id } });
  }

  async findAll(): Promise<CommunityEvent[]> {
    return prisma.communityEvent.findMany({ orderBy: { startDate: "asc" } });
  }

  async findActiveCatalog(filters: CommunityEventCatalogFilters): Promise<CommunityEventCatalogItem[]> {
    const where = {
      status: {
        in: ["ACTIVE", "ACTIVE_FULL"] as CommunityEventStatus[]
      },
      category: filters.category
        ? {
            equals: filters.category,
            mode: "insensitive" as const
          }
        : undefined,
      publicSpace: filters.zone
        ? {
            zone: {
              equals: filters.zone,
              mode: "insensitive" as const
            }
          }
        : undefined,
      startDate: filters.date ? this.buildDateFilter(filters.date) : undefined
    };

    const communityEvents = await prisma.communityEvent.findMany({
      where,
      include: {
        publicSpace: true,
        _count: {
          select: {
            registrations: true
          }
        }
      },
      orderBy: { startDate: "asc" }
    });

    return communityEvents
      .map((communityEvent) => {
        const registeredCount = communityEvent._count.registrations;
        const availableCapacity = communityEvent.requiresRegistration
          ? Math.max(communityEvent.capacity - registeredCount, 0)
          : communityEvent.capacity;

        return {
          id: communityEvent.id,
          title: communityEvent.title,
          category: communityEvent.category,
          description: communityEvent.description,
          organizerName: communityEvent.organizerName,
          capacity: communityEvent.capacity,
          registeredCount,
          availableCapacity,
          requiresRegistration: communityEvent.requiresRegistration,
          startDate: communityEvent.startDate,
          endDate: communityEvent.endDate,
          status: communityEvent.status,
          imageUrl: communityEvent.imageUrl,
          publicSpace: {
            id: communityEvent.publicSpace.id,
            name: communityEvent.publicSpace.name,
            address: communityEvent.publicSpace.address,
            zone: communityEvent.publicSpace.zone
          }
        };
      })
      .filter((communityEvent) => {
        if (!filters.availableOnly) {
          return true;
        }

        return !communityEvent.requiresRegistration || communityEvent.availableCapacity > 0;
      });
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

  async updateStatus(id: string, status: CommunityEventStatus): Promise<CommunityEvent> {
    return prisma.communityEvent.update({
      where: { id },
      data: { status }
    });
  }

  private buildDateFilter(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return {
      gte: startOfDay,
      lte: endOfDay
    };
  }
}
