import { CreatePublicSpaceData, PublicSpace, UpdatePublicSpaceData } from "../../domain/entities/PublicSpace";
import { PublicSpaceFilters, PublicSpaceRepository } from "../../domain/repositories/PublicSpaceRepository";
import { prisma } from "./prismaClient";

export class PrismaPublicSpaceRepository implements PublicSpaceRepository {
  async create(data: CreatePublicSpaceData): Promise<PublicSpace> {
    return prisma.publicSpace.create({ data });
  }

  async findById(id: string): Promise<PublicSpace | null> {
    return prisma.publicSpace.findUnique({ where: { id } });
  }

  async findAll(filters?: PublicSpaceFilters): Promise<PublicSpace[]> {
    return prisma.publicSpace.findMany({
      where: {
        status: filters?.status
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async update(id: string, data: UpdatePublicSpaceData): Promise<PublicSpace> {
    return prisma.publicSpace.update({
      where: { id },
      data
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.publicSpace.delete({
      where: { id }
    });
  }
}
