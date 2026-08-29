import { UpdateAdminProfileUseCase } from "../../src/application/use-cases/UpdateAdminProfileUseCase";
import { Admin, UpdateAdminData } from "../../src/domain/entities/Admin";
import { AdminRepository } from "../../src/domain/repositories/AdminRepository";

class FakeAdminRepository implements AdminRepository {
  public admin: Admin | null = {
    id: "admin-1",
    username: "admin",
    name: "Gestión Municipal",
    email: "admin@citypass.test",
    phone: null,
    department: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  async findById(id: string): Promise<Admin | null> {
    return this.admin?.id === id ? this.admin : null;
  }

  async update(id: string, data: UpdateAdminData): Promise<Admin> {
    if (!this.admin || this.admin.id !== id) {
      throw new Error("Admin no encontrado.");
    }

    this.admin = {
      ...this.admin,
      ...data,
      updatedAt: new Date()
    };

    return this.admin;
  }
}

describe("UpdateAdminProfileUseCase", () => {
  it("actualiza los datos editables del administrador", async () => {
    const repository = new FakeAdminRepository();
    const useCase = new UpdateAdminProfileUseCase(repository);

    const admin = await useCase.execute({
      adminId: "admin-1",
      name: "Coordinación Cultural",
      email: "coordinacion@citypass.test",
      phone: "+54 11 5555-5555",
      department: "Cultura"
    });

    expect(admin.name).toBe("Coordinación Cultural");
    expect(admin.email).toBe("coordinacion@citypass.test");
  });

  it("rechaza un correo electrónico inválido", async () => {
    const repository = new FakeAdminRepository();
    const useCase = new UpdateAdminProfileUseCase(repository);

    await expect(
      useCase.execute({
        adminId: "admin-1",
        name: "Coordinación Cultural",
        email: "correo-invalido"
      })
    ).rejects.toThrow("Ingresá un correo electrónico válido.");
  });
});
