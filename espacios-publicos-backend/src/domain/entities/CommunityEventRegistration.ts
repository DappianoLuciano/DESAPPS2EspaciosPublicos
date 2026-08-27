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

export interface CitizenCommunityEventRegistration {
  id: string;
  communityEventId: string;
  citizenName: string;
  citizenEmail: string;
  createdAt: Date;
  communityEvent: {
    id: string;
    title: string;
    category: string;
    description: string;
    capacity: number;
    requiresRegistration: boolean;
    startDate: Date;
    endDate: Date;
    status: string;
    imageUrl?: string | null;
    publicSpace: {
      id: string;
      name: string;
      address: string;
      zone: string;
    };
  };
}
