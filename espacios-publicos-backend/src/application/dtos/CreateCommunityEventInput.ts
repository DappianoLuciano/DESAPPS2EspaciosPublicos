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
}
