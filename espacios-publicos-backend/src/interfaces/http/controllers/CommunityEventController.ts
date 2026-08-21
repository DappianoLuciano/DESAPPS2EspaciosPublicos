import { Request, Response } from "express";
import { CreateCommunityEventUseCase } from "../../../application/use-cases/CreateCommunityEventUseCase";
import { ListCommunityEventsUseCase } from "../../../application/use-cases/ListCommunityEventsUseCase";
import { ListCommunityEventRegistrationsUseCase } from "../../../application/use-cases/ListCommunityEventRegistrationsUseCase";
import { RegisterCitizenToCommunityEventUseCase } from "../../../application/use-cases/RegisterCitizenToCommunityEventUseCase";

export class CommunityEventController {
  constructor(
    private readonly createCommunityEventUseCase: CreateCommunityEventUseCase,
    private readonly listCommunityEventsUseCase: ListCommunityEventsUseCase,
    private readonly registerCitizenToCommunityEventUseCase: RegisterCitizenToCommunityEventUseCase,
    private readonly listCommunityEventRegistrationsUseCase: ListCommunityEventRegistrationsUseCase
  ) {}

  create = async (request: Request, response: Response): Promise<void> => {
    const communityEvent = await this.createCommunityEventUseCase.execute(request.body);
    response.status(201).json(communityEvent);
  };

  list = async (request: Request, response: Response): Promise<void> => {
    const communityEvents = await this.listCommunityEventsUseCase.execute({
      category: this.getStringQuery(request.query.category),
      zone: this.getStringQuery(request.query.zone),
      date: this.getStringQuery(request.query.date),
      availableOnly: request.query.availableOnly === "true"
    });

    response.json(communityEvents);
  };

  registerCitizen = async (request: Request, response: Response): Promise<void> => {
    const registration = await this.registerCitizenToCommunityEventUseCase.execute({
      communityEventId: request.params.id,
      citizenName: request.body.citizenName,
      citizenEmail: request.body.citizenEmail
    });

    response.status(201).json(registration);
  };

  listRegistrations = async (request: Request, response: Response): Promise<void> => {
    const registrations = await this.listCommunityEventRegistrationsUseCase.execute(request.params.id);
    response.json(registrations);
  };

  private getStringQuery(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }
}
