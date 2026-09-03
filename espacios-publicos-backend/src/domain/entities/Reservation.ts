export type ReservationStatus = "CONFIRMED" | "CANCELLED";

export interface Reservation {
  id: string;
  publicSpaceId: string;
  requesterName: string;
  requesterEmail: string;
  estimatedAttendees: number;
  startDate: Date;
  endDate: Date;
  status: ReservationStatus;
  createdAt: Date;
}

export interface RequestReservationData {
  publicSpaceId: string;
  requesterName: string;
  requesterEmail: string;
  estimatedAttendees: number;
  startDate: Date;
  endDate: Date;
}
