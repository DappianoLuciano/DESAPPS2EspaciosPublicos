import { Request, Response } from "express";
import { CancelCommunityEventRegistrationUseCase } from "../../../application/use-cases/CancelCommunityEventRegistrationUseCase";
import { CreateCommunityEventUseCase } from "../../../application/use-cases/CreateCommunityEventUseCase";
import { GetCommunityEventUseCase } from "../../../application/use-cases/GetCommunityEventUseCase";
import { ListCitizenCommunityEventRegistrationsUseCase } from "../../../application/use-cases/ListCitizenCommunityEventRegistrationsUseCase";
import { ListCommunityEventsUseCase } from "../../../application/use-cases/ListCommunityEventsUseCase";
import { ListCommunityEventRegistrationsUseCase } from "../../../application/use-cases/ListCommunityEventRegistrationsUseCase";
import { RegisterCitizenToCommunityEventUseCase } from "../../../application/use-cases/RegisterCitizenToCommunityEventUseCase";

export class CommunityEventController {
  constructor(
    private readonly createCommunityEventUseCase: CreateCommunityEventUseCase,
    private readonly listCommunityEventsUseCase: ListCommunityEventsUseCase,
    private readonly getCommunityEventUseCase: GetCommunityEventUseCase,
    private readonly registerCitizenToCommunityEventUseCase: RegisterCitizenToCommunityEventUseCase,
    private readonly listCommunityEventRegistrationsUseCase: ListCommunityEventRegistrationsUseCase,
    private readonly listCitizenCommunityEventRegistrationsUseCase: ListCitizenCommunityEventRegistrationsUseCase,
    private readonly cancelCommunityEventRegistrationUseCase: CancelCommunityEventRegistrationUseCase
  ) {}

  create = async (request: Request, response: Response): Promise<void> => {
    const communityEvent = await this.createCommunityEventUseCase.execute({
      ...request.body,
      organizerName: request.user?.name,
      organizerProfileEnabled: request.user?.role === "municipal_admin"
    });
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

  getById = async (request: Request, response: Response): Promise<void> => {
    const communityEvent = await this.getCommunityEventUseCase.execute(request.params.id);
    response.json(communityEvent);
  };

  registerCitizen = async (request: Request, response: Response): Promise<void> => {
    const registration = await this.registerCitizenToCommunityEventUseCase.execute({
      communityEventId: request.params.id,
      citizenName: request.user?.name || "",
      citizenEmail: request.user?.email || ""
    });

    response.status(201).json(registration);
  };

  listRegistrations = async (request: Request, response: Response): Promise<void> => {
    const registrations = await this.listCommunityEventRegistrationsUseCase.execute(request.params.id);
    response.json(registrations);
  };

  listCitizenRegistrations = async (request: Request, response: Response): Promise<void> => {
    const registrations = await this.listCitizenCommunityEventRegistrationsUseCase.execute(
      request.user?.email
    );

    response.json(registrations);
  };

  cancelRegistration = async (request: Request, response: Response): Promise<void> => {
    await this.cancelCommunityEventRegistrationUseCase.execute(
      request.params.registrationId,
      request.user?.email
    );

    response.status(204).send();
  };

  private getStringQuery(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }
}
