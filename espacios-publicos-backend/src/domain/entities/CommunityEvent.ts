export type CommunityEventStatus = "ACTIVE" | "ACTIVE_FULL" | "CANCELLED";

export interface CommunityEvent {
  id: string;
  title: string;
  category: string;
  tags: string[];
  description: string;
  requirements: string[];
  publicSpaceId: string;
  organizerName: string;
  capacity: number;
  requiresRegistration: boolean;
  startDate: Date;
  endDate: Date;
  status: CommunityEventStatus;
  imageUrl?: string | null;
  createdAt: Date;
}

export interface CreateCommunityEventData {
  title: string;
  category: string;
  tags: string[];
  description: string;
  requirements: string[];
  publicSpaceId: string;
  organizerName: string;
  capacity: number;
  requiresRegistration: boolean;
  startDate: Date;
  endDate: Date;
  imageUrl?: string | null;
}
