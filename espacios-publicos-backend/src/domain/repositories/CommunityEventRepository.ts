import { CommunityEvent, CreateCommunityEventData } from "../entities/CommunityEvent";

export interface CommunityEventRepository {
  create(data: CreateCommunityEventData): Promise<CommunityEvent>;
  findAll(): Promise<CommunityEvent[]>;
  findOverlapping(publicSpaceId: string, startDate: Date, endDate: Date): Promise<CommunityEvent[]>;
}
