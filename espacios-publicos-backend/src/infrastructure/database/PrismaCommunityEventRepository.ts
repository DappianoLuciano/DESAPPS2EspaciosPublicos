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
import { ValidationError } from "../../shared/errors/ValidationError";

export class PrismaCommunityEventRepository implements CommunityEventRepository {
  async create(data: CreateCommunityEventData): Promise<CommunityEvent> {
    return prisma.communityEvent.create({ data });
  }

  async findById(id: string): Promise<CommunityEvent | null> {
    const event = await prisma.communityEvent.findUnique({ where: { id },
      include: { weatherRestrictions: { where: { releasedAt: null }, select: { alertId: true } } } });
    if (!event) return null;
    const { weatherRestrictions, ...data } = event;
    return { ...data, activeWeatherAlertIds: weatherRestrictions.map(row => row.alertId) };
  }

  async findAll(): Promise<CommunityEvent[]> {
    return prisma.communityEvent.findMany({ orderBy: { startDate: "asc" } });
  }

  async findActiveCatalogById(id: string): Promise<CommunityEventCatalogItem | null> {
    // Mantener accesible el detalle de suspendidos/cancelados desde avisos e inscripciones.
    const communityEvent = await prisma.communityEvent.findFirst({
      where: {
        id
      },
      include: {
        publicSpace: true,
        weatherRestrictions: { where: { releasedAt: null }, select: { alertId: true } },
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
      status: filters.includeUnavailable ? undefined : {
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
        weatherRestrictions: { where: { releasedAt: null }, select: { alertId: true } },
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

        return communityEvent.status === "ACTIVE" &&
          (!communityEvent.requiresRegistration || communityEvent.availableCapacity > 0);
      });
  }

  async findOverlapping(publicSpaceId: string, startDate: Date, endDate: Date): Promise<CommunityEvent[]> {
    return prisma.communityEvent.findMany({
      where: {
        publicSpaceId,
        status: {
          in: ["ACTIVE", "ACTIVE_FULL", "SUSPENDED"]
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

  async updateStatus(id: string, status: CommunityEventStatus, reason?: string | null, expectedStatus?: CommunityEventStatus): Promise<CommunityEvent> {
    try {
      return await prisma.communityEvent.update({
        where: { id, status: expectedStatus,
          ...(expectedStatus === "SUSPENDED" && status !== "CANCELLED" ? { weatherRestrictions: { none: { releasedAt: null } } } : {}) },
        data: { status, ...(reason !== undefined ? { statusReason: reason } : {}) }
      });
    } catch (error) {
      if (expectedStatus && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ValidationError("El estado del evento cambió. Actualizá el listado antes de continuar.");
      }
      throw error;
    }
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
      weatherRestrictions?: { alertId: string }[];
      publicSpace: {
        id: string;
        name: string;
        address: string;
        zone: string;
        latitude?: number | null;
        longitude?: number | null;
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
      statusReason: communityEvent.statusReason ?? null,
      activeWeatherAlertIds: communityEvent.weatherRestrictions?.map(row => row.alertId) || [],
      imageUrl: communityEvent.imageUrl,
      publicSpace: {
        id: communityEvent.publicSpace.id,
        name: communityEvent.publicSpace.name,
        address: communityEvent.publicSpace.address,
        zone: communityEvent.publicSpace.zone,
        latitude: communityEvent.publicSpace.latitude ?? null,
        longitude: communityEvent.publicSpace.longitude ?? null
      }
    };
  }
}
