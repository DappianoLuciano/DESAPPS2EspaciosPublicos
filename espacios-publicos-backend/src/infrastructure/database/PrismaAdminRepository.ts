import { Admin, UpdateAdminData } from "../../domain/entities/Admin";
import { AdminRepository } from "../../domain/repositories/AdminRepository";
import { prisma } from "./prismaClient";

export class PrismaAdminRepository implements AdminRepository {
  async findById(id: string): Promise<Admin | null> {
    return prisma.admin.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateAdminData): Promise<Admin> {
    return prisma.admin.update({
      where: { id },
      data
    });
  }
}
