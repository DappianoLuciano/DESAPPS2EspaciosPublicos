export interface RequestReservationInput {
  publicSpaceId: string;
  requesterName: string;
  requesterEmail: string;
  estimatedAttendees: number;
  startDate: string;
  endDate: string;
}
