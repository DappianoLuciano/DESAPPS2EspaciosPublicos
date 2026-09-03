import { CommunityEvent, CommunityEventStatus, CreateCommunityEventData } from "../entities/CommunityEvent";
import { CommunityEventCatalogItem } from "../entities/CommunityEventCatalogItem";

export interface CommunityEventCatalogFilters {
  category?: string;
  search?: string;
  zone?: string;
  date?: Date;
  availableOnly?: boolean;
  upcomingOnly?: boolean;
}

export interface CommunityEventRepository {
  create(data: CreateCommunityEventData): Promise<CommunityEvent>;
  findById(id: string): Promise<CommunityEvent | null>;
  findAll(): Promise<CommunityEvent[]>;
  findActiveCatalogById(id: string): Promise<CommunityEventCatalogItem | null>;
  findActiveCatalog(filters: CommunityEventCatalogFilters): Promise<CommunityEventCatalogItem[]>;
  findOverlapping(publicSpaceId: string, startDate: Date, endDate: Date): Promise<CommunityEvent[]>;
  updateStatus(id: string, status: CommunityEventStatus): Promise<CommunityEvent>;
}
