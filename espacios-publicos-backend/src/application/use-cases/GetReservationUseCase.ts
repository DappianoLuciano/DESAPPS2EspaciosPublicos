import { Reservation } from "../../domain/entities/Reservation";
import { ReservationRepository } from "../../domain/repositories/ReservationRepository";
import { NotFoundError } from "../../shared/errors/NotFoundError";

export class GetReservationUseCase {
  constructor(private readonly reservationRepository: ReservationRepository) {}

  async execute(id: string): Promise<Reservation> {
    const reservation = await this.reservationRepository.findById(id);
    if (!reservation) {
      throw new NotFoundError("La reserva indicada no existe.");
    }
    return reservation;
  }
}
