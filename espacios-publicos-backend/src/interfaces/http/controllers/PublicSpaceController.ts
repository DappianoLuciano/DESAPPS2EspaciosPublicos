import { Request, Response } from "express";
import { CreatePublicSpaceUseCase } from "../../../application/use-cases/CreatePublicSpaceUseCase";
import { DeletePublicSpaceUseCase } from "../../../application/use-cases/DeletePublicSpaceUseCase";
import { ListPublicSpacesUseCase } from "../../../application/use-cases/ListPublicSpacesUseCase";
import { UpdatePublicSpaceUseCase } from "../../../application/use-cases/UpdatePublicSpaceUseCase";
import { ValidationError } from "../../../shared/errors/ValidationError";

export class PublicSpaceController {
  constructor(
    private readonly createPublicSpaceUseCase: CreatePublicSpaceUseCase,
    private readonly listPublicSpacesUseCase: ListPublicSpacesUseCase,
    private readonly updatePublicSpaceUseCase: UpdatePublicSpaceUseCase,
    private readonly deletePublicSpaceUseCase: DeletePublicSpaceUseCase
  ) {}

  create = async (request: Request, response: Response): Promise<void> => {
    const publicSpace = await this.createPublicSpaceUseCase.execute(request.body);
    response.status(201).json(publicSpace);
  };

  list = async (request: Request, response: Response): Promise<void> => {
    const status = this.getStatusQuery(request.query.status);
    const publicSpaces = await this.listPublicSpacesUseCase.execute({ status });
    response.json(publicSpaces);
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const publicSpace = await this.updatePublicSpaceUseCase.execute(request.params.id, request.body);
    response.json(publicSpace);
  };

  delete = async (request: Request, response: Response): Promise<void> => {
    await this.deletePublicSpaceUseCase.execute(request.params.id);
    response.status(204).send();
  };

  private getStatusQuery(value: unknown): "ENABLED" | "DISABLED" | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === "ENABLED" || value === "DISABLED") {
      return value;
    }

    throw new ValidationError("El parametro status debe ser ENABLED o DISABLED.");
  }
}
