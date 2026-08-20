import { Request, Response } from "express";
import { CreatePublicSpaceUseCase } from "../../../application/use-cases/CreatePublicSpaceUseCase";
import { ListPublicSpacesUseCase } from "../../../application/use-cases/ListPublicSpacesUseCase";

export class PublicSpaceController {
  constructor(
    private readonly createPublicSpaceUseCase: CreatePublicSpaceUseCase,
    private readonly listPublicSpacesUseCase: ListPublicSpacesUseCase
  ) {}

  create = async (request: Request, response: Response): Promise<void> => {
    const publicSpace = await this.createPublicSpaceUseCase.execute(request.body);
    response.status(201).json(publicSpace);
  };

  list = async (_request: Request, response: Response): Promise<void> => {
    const publicSpaces = await this.listPublicSpacesUseCase.execute();
    response.json(publicSpaces);
  };
}
