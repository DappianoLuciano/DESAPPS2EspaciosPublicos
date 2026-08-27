import {
  CitizenCommunityEventRegistration,
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
  findById(id: string): Promise<CitizenCommunityEventRegistration | null>;
  findByCitizenEmail(citizenEmail: string): Promise<CitizenCommunityEventRegistration[]>;
  deleteById(id: string): Promise<void>;
}
