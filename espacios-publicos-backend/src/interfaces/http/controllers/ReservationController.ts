import { Request, Response } from "express";
import { ListReservationsUseCase } from "../../../application/use-cases/ListReservationsUseCase";
import { RequestReservationUseCase } from "../../../application/use-cases/RequestReservationUseCase";

export class ReservationController {
  constructor(
    private readonly requestReservationUseCase: RequestReservationUseCase,
    private readonly listReservationsUseCase: ListReservationsUseCase
  ) {}

  create = async (request: Request, response: Response): Promise<void> => {
    const reservation = await this.requestReservationUseCase.execute(request.body);
    response.status(201).json(reservation);
  };

  list = async (_request: Request, response: Response): Promise<void> => {
    const reservations = await this.listReservationsUseCase.execute();
    response.json(reservations);
  };
}
