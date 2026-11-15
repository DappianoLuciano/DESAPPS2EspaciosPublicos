export interface RequestReservationInput {
  publicSpaceId: string;
  requesterName: string;
  requesterEmail: string;
  estimatedAttendees: number;
  startDate: string;
  endDate: string;
  /** sub del usuario autenticado; lo completa el controller, nunca el body. */
  actorSub?: string | null;
}
