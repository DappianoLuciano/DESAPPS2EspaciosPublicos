import { CreatePublicSpaceData, PublicSpace } from "../../domain/entities/PublicSpace";
import { PublicSpaceRepository } from "../../domain/repositories/PublicSpaceRepository";
import { prisma } from "./prismaClient";

export class PrismaPublicSpaceRepository implements PublicSpaceRepository {
  async create(data: CreatePublicSpaceData): Promise<PublicSpace> {
    return prisma.publicSpace.create({ data });
  }

  async findById(id: string): Promise<PublicSpace | null> {
    return prisma.publicSpace.findUnique({ where: { id } });
  }

  async findAll(): Promise<PublicSpace[]> {
    return prisma.publicSpace.findMany({ orderBy: { createdAt: "desc" } });
  }
}
