export type PublicSpaceStatus = "ENABLED" | "DISABLED";

export interface PublicSpace {
  id: string;
  name: string;
  description: string;
  address: string;
  zone?: string;
  capacity: number;
  status: PublicSpaceStatus;
  imageUrl?: string | null;
  createdAt: Date;
}

export interface CreatePublicSpaceData {
  name: string;
  description: string;
  address: string;
  zone?: string;
  capacity: number;
  status?: PublicSpaceStatus;
  imageUrl?: string | null;
}

export interface UpdatePublicSpaceData {
  name?: string;
  description?: string;
  address?: string;
  zone?: string;
  capacity?: number;
  status?: PublicSpaceStatus;
  imageUrl?: string | null;
}
