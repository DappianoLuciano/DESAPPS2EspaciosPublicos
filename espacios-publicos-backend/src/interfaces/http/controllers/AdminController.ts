import { Request, Response } from "express";
import { GetAdminProfileUseCase } from "../../../application/use-cases/GetAdminProfileUseCase";
import { UpdateAdminProfileUseCase } from "../../../application/use-cases/UpdateAdminProfileUseCase";

export class AdminController {
  constructor(
    private readonly getAdminProfileUseCase: GetAdminProfileUseCase,
    private readonly updateAdminProfileUseCase: UpdateAdminProfileUseCase
  ) {}

  getProfile = async (request: Request, response: Response): Promise<void> => {
    const admin = await this.getAdminProfileUseCase.execute(request.user?.id || "");
    response.json(admin);
  };

  updateProfile = async (request: Request, response: Response): Promise<void> => {
    const admin = await this.updateAdminProfileUseCase.execute({
      ...request.body,
      adminId: request.user?.id || ""
    });

    response.json(admin);
  };
}
