import { Request, Response } from "express";
import { ListReservationsUseCase } from "../../../application/use-cases/ListReservationsUseCase";
import { RequestReservationUseCase } from "../../../application/use-cases/RequestReservationUseCase";
import { GetReservationUseCase } from "../../../application/use-cases/GetReservationUseCase";

export class ReservationController {
  constructor(
    private readonly requestReservationUseCase: RequestReservationUseCase,
    private readonly listReservationsUseCase: ListReservationsUseCase,
    private readonly getReservationUseCase: GetReservationUseCase
  ) {}

  create = async (request: Request, response: Response): Promise<void> => {
    const reservation = await this.requestReservationUseCase.execute({
      ...request.body,
      requesterName: request.user?.name || "",
      requesterEmail: request.user?.email || ""
    });
    response.status(201).json(reservation);
  };

  list = async (_request: Request, response: Response): Promise<void> => {
    const reservations = await this.listReservationsUseCase.execute();
    response.json(reservations);
  };

  getById = async (request: Request, response: Response): Promise<void> => {
    const reservation = await this.getReservationUseCase.execute(request.params.id);
    response.json(reservation);
  };
}
