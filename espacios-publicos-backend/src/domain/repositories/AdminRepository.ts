import { Admin, UpdateAdminData } from "../entities/Admin";

export interface AdminRepository {
  findById(id: string): Promise<Admin | null>;
  update(id: string, data: UpdateAdminData): Promise<Admin>;
}
