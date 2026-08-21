import {
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
}
