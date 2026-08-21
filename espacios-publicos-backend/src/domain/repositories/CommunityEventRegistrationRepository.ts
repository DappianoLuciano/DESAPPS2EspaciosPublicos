import {
  CommunityEventRegistration,
  CreateCommunityEventRegistrationData
} from "../entities/CommunityEventRegistration";

export interface CommunityEventRegistrationRepository {
  create(data: CreateCommunityEventRegistrationData): Promise<CommunityEventRegistration>;
  countByEventId(communityEventId: string): Promise<number>;
  findByEventAndCitizenEmail(
    communityEventId: string,
    citizenEmail: string
  ): Promise<CommunityEventRegistration | null>;
  findByEventId(communityEventId: string): Promise<CommunityEventRegistration[]>;
}
