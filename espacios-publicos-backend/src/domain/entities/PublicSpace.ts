export interface PublicSpace {
  id: string;
  name: string;
  description: string;
  address: string;
  capacity: number;
  imageUrl?: string | null;
  createdAt: Date;
}

export interface CreatePublicSpaceData {
  name: string;
  description: string;
  address: string;
  capacity: number;
  imageUrl?: string | null;
}
