import { RequestReservationData, Reservation } from "../entities/Reservation";

export interface ReservationRepository {
  findById(id: string): Promise<Reservation | null>;
  create(data: RequestReservationData): Promise<Reservation>;
  findAll(): Promise<Reservation[]>;
  findOverlapping(publicSpaceId: string, startDate: Date, endDate: Date): Promise<Reservation[]>;
}
