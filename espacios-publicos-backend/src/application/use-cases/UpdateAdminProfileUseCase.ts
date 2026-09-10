import { Admin } from "../../domain/entities/Admin";
import { AdminRepository } from "../../domain/repositories/AdminRepository";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ValidationError } from "../../shared/errors/ValidationError";
import {
  nullableText,
  requireEmail,
  requireText
} from "../../shared/validation/inputValidation";
import { UpdateAdminProfileInput } from "../dtos/UpdateAdminProfileInput";

export class UpdateAdminProfileUseCase {
  constructor(private readonly adminRepository: AdminRepository) {}

  async execute(input: UpdateAdminProfileInput): Promise<Admin> {
    const adminId = requireText(input.adminId, "El administrador", 128);
    const name = requireText(input.name, "El nombre", 120);
    const email = requireEmail(input.email);
    const phone = nullableText(input.phone, "El telefono", 50);
    const department = nullableText(input.department, "El departamento", 120);

    const existingAdmin = await this.adminRepository.findById(adminId);

    if (!existingAdmin) {
      throw new NotFoundError("El perfil administrativo no existe.");
    }

    return this.adminRepository.update(adminId, {
      name,
      email,
      phone: phone ?? null,
      department: department ?? null
    });
  }
}
