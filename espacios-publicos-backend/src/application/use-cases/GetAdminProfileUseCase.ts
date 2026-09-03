import { Admin } from "../../domain/entities/Admin";
import { AdminRepository } from "../../domain/repositories/AdminRepository";
import { NotFoundError } from "../../shared/errors/NotFoundError";

export class GetAdminProfileUseCase {
  constructor(private readonly adminRepository: AdminRepository) {}

  async execute(adminId: string): Promise<Admin> {
    const admin = await this.adminRepository.findById(adminId);

    if (!admin) {
      throw new NotFoundError("El perfil administrativo no existe.");
    }

    return admin;
  }
}
