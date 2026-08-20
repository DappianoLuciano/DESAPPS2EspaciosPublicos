import { Request, Response } from "express";
import { CreateCommunityEventUseCase } from "../../../application/use-cases/CreateCommunityEventUseCase";
import { ListCommunityEventsUseCase } from "../../../application/use-cases/ListCommunityEventsUseCase";

export class CommunityEventController {
  constructor(
    private readonly createCommunityEventUseCase: CreateCommunityEventUseCase,
    private readonly listCommunityEventsUseCase: ListCommunityEventsUseCase
  ) {}

  create = async (request: Request, response: Response): Promise<void> => {
    const communityEvent = await this.createCommunityEventUseCase.execute(request.body);
    response.status(201).json(communityEvent);
  };

  list = async (_request: Request, response: Response): Promise<void> => {
    const communityEvents = await this.listCommunityEventsUseCase.execute();
    response.json(communityEvents);
  };
}
