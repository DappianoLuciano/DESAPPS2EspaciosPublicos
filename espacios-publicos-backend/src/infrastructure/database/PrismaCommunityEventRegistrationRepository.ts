import {
  CitizenCommunityEventRegistration,
  CommunityEventRegistration,
  CreateCommunityEventRegistrationData
} from "../../domain/entities/CommunityEventRegistration";
import { CommunityEventRegistrationRepository } from "../../domain/repositories/CommunityEventRegistrationRepository";
import { prisma } from "./prismaClient";

export class PrismaCommunityEventRegistrationRepository
  implements CommunityEventRegistrationRepository
{
  async create(data: CreateCommunityEventRegistrationData): Promise<CommunityEventRegistration> {
    return prisma.communityEventRegistration.create({ data });
  }

  async countByEventId(communityEventId: string): Promise<number> {
    return prisma.communityEventRegistration.count({
      where: { communityEventId }
    });
  }

  async findByEventAndCitizenEmail(
    communityEventId: string,
    citizenEmail: string
  ): Promise<CommunityEventRegistration | null> {
    return prisma.communityEventRegistration.findUnique({
      where: {
        communityEventId_citizenEmail: {
          communityEventId,
          citizenEmail
        }
      }
    });
  }

  async findByEventId(communityEventId: string): Promise<CommunityEventRegistration[]> {
    return prisma.communityEventRegistration.findMany({
      where: { communityEventId },
      orderBy: { createdAt: "asc" }
    });
  }

  async findById(id: string): Promise<CitizenCommunityEventRegistration | null> {
    return prisma.communityEventRegistration.findUnique({
      where: { id },
      include: {
        communityEvent: {
          include: {
            publicSpace: true
          }
        }
      }
    });
  }

  async findByCitizenEmail(citizenEmail: string): Promise<CitizenCommunityEventRegistration[]> {
    return prisma.communityEventRegistration.findMany({
      where: {
        citizenEmail: {
          equals: citizenEmail,
          mode: "insensitive"
        }
      },
      include: {
        communityEvent: {
          include: {
            publicSpace: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  async deleteById(id: string): Promise<void> {
    await prisma.communityEventRegistration.delete({
      where: { id }
    });
  }
}
