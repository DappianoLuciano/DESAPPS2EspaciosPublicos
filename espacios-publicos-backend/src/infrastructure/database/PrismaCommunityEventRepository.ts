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
import { Prisma } from "@prisma/client";
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

  async findActiveCatalogById(id: string): Promise<CommunityEventCatalogItem | null> {
    const communityEvent = await prisma.communityEvent.findFirst({
      where: {
        id,
        status: {
          in: ["ACTIVE", "ACTIVE_FULL"]
        }
      },
      include: {
        publicSpace: true,
        _count: {
          select: {
            registrations: true
          }
        }
      }
    });

    if (!communityEvent) {
      return null;
    }

    return this.toCatalogItem(communityEvent);
  }

  async findActiveCatalog(filters: CommunityEventCatalogFilters): Promise<CommunityEventCatalogItem[]> {
    const categoryFilter: Prisma.CommunityEventWhereInput | undefined = filters.category
      ? {
          OR: [
            {
              category: {
                equals: filters.category,
                mode: "insensitive"
              }
            },
            {
              tags: {
                has: filters.category
              }
            }
          ]
        }
      : undefined;

    const searchFilter: Prisma.CommunityEventWhereInput | undefined = filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } },
            { category: { contains: filters.search, mode: "insensitive" } },
            { organizerName: { contains: filters.search, mode: "insensitive" } },
            {
              publicSpace: {
                is: {
                  OR: [
                    { name: { contains: filters.search, mode: "insensitive" } },
                    { zone: { contains: filters.search, mode: "insensitive" } }
                  ]
                }
              }
            }
          ]
        }
      : undefined;

    const where: Prisma.CommunityEventWhereInput = {
      status: {
        in: ["ACTIVE", "ACTIVE_FULL"] as CommunityEventStatus[]
      },
      AND: [categoryFilter, searchFilter].filter(
        (filter): filter is Prisma.CommunityEventWhereInput => Boolean(filter)
      ),
      publicSpace: filters.zone
        ? {
            zone: {
              equals: filters.zone,
              mode: "insensitive" as const
            }
          }
        : undefined,
      startDate: filters.date ? this.buildDateFilter(filters.date) : undefined,
      endDate: filters.upcomingOnly ? { gte: new Date() } : undefined
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
      .map((communityEvent) => this.toCatalogItem(communityEvent))
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

  private toCatalogItem(
    communityEvent: CommunityEvent & {
      publicSpace: {
        id: string;
        name: string;
        address: string;
        zone: string;
      };
      _count: {
        registrations: number;
      };
    }
  ): CommunityEventCatalogItem {
    const registeredCount = communityEvent._count.registrations;
    const availableCapacity = communityEvent.requiresRegistration
      ? Math.max(communityEvent.capacity - registeredCount, 0)
      : communityEvent.capacity;

    return {
      id: communityEvent.id,
      title: communityEvent.title,
      category: communityEvent.category,
      tags: communityEvent.tags,
      description: communityEvent.description,
      requirements: communityEvent.requirements,
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
  }
}
