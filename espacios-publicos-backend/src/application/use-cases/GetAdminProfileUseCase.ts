import { Admin } from "../../domain/entities/Admin";
import { AdminRepository } from "../../domain/repositories/AdminRepository";
import { NotFoundError } from "../../shared/errors/NotFoundError";

export class GetAdminProfileUseCase {
  constructor(private readonly adminRepository: AdminRepository) {}

  async execute(
    adminId: string,
    fallbackProfile?: { username: string; name: string; email: string }
  ): Promise<Admin> {
    const admin = await this.adminRepository.findById(adminId);

    if (!admin) {
      if (fallbackProfile) {
        return {
          id: adminId,
          username: fallbackProfile.username,
          name: fallbackProfile.name,
          email: fallbackProfile.email,
          phone: null,
          department: "Espacios Públicos y Cultura",
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      throw new NotFoundError("El perfil administrativo no existe.");
    }

    return admin;
  }
}

