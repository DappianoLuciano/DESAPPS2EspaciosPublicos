import { CommunityEventStatus } from "./CommunityEvent";

export interface CommunityEventCatalogItem {
  id: string;
  title: string;
  category: string;
  description: string;
  organizerName: string;
  capacity: number;
  registeredCount: number;
  availableCapacity: number;
  requiresRegistration: boolean;
  startDate: Date;
  endDate: Date;
  status: CommunityEventStatus;
  imageUrl?: string | null;
  publicSpace: {
    id: string;
    name: string;
    address: string;
    zone: string;
  };
}
