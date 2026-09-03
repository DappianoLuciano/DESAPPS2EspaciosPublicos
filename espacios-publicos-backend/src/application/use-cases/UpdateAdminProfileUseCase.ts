import { Admin } from "../../domain/entities/Admin";
import { AdminRepository } from "../../domain/repositories/AdminRepository";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ValidationError } from "../../shared/errors/ValidationError";
import { UpdateAdminProfileInput } from "../dtos/UpdateAdminProfileInput";

export class UpdateAdminProfileUseCase {
  constructor(private readonly adminRepository: AdminRepository) {}

  async execute(input: UpdateAdminProfileInput): Promise<Admin> {
    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase();

    if (!name || !email) {
      throw new ValidationError("Nombre y correo electrónico son obligatorios.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ValidationError("Ingresá un correo electrónico válido.");
    }

    const existingAdmin = await this.adminRepository.findById(input.adminId);

    if (!existingAdmin) {
      throw new NotFoundError("El perfil administrativo no existe.");
    }

    return this.adminRepository.update(input.adminId, {
      name,
      email,
      phone: input.phone?.trim() || null,
      department: input.department?.trim() || null
    });
  }
}
