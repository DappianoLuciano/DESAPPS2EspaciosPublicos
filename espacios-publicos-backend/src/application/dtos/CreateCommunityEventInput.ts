export interface CreateCommunityEventInput {
  title: string;
  category: string;
  description: string;
  publicSpaceId: string;
  organizerName: string;
  capacity: number;
  requiresRegistration: boolean;
  startDate: string;
  endDate: string;
  imageUrl?: string | null;
}
