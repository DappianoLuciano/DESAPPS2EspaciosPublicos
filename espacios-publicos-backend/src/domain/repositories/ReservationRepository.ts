import { RequestReservationData, Reservation } from "../entities/Reservation";

export interface ReservationRepository {
  create(data: RequestReservationData): Promise<Reservation>;
  findAll(): Promise<Reservation[]>;
  findOverlapping(publicSpaceId: string, startDate: Date, endDate: Date): Promise<Reservation[]>;
}
