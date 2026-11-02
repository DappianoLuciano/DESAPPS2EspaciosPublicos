export interface CreateCommunityEventInput {
  title: string;
  category: string;
  tags?: string[];
  description: string;
  requirements?: string[];
  publicSpaceId: string;
  organizerName: string;
  organizerProfileEnabled?: boolean;
  capacity: number;
  requiresRegistration?: boolean;
  startDate: string;
  endDate: string;
  imageUrl?: string | null;
  // sub del token del organizador. Lo completa el controller, nunca el body.
  organizerSub?: string | null;
}
