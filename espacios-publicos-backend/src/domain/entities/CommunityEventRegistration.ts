export interface CommunityEventRegistration {
  id: string;
  communityEventId: string;
  citizenName: string;
  citizenEmail: string;
  createdAt: Date;
}

export interface CreateCommunityEventRegistrationData {
  communityEventId: string;
  citizenName: string;
  citizenEmail: string;
}
