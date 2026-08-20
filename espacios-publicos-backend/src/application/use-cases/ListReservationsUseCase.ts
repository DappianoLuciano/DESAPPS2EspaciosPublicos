import { Reservation } from "../../domain/entities/Reservation";
import { ReservationRepository } from "../../domain/repositories/ReservationRepository";

export class ListReservationsUseCase {
  constructor(private readonly reservationRepository: ReservationRepository) {}

  async execute(): Promise<Reservation[]> {
    return this.reservationRepository.findAll();
  }
}
