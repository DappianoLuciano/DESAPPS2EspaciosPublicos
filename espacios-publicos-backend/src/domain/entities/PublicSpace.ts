export type PublicSpaceStatus = "ENABLED" | "DISABLED";
export type PublicSpaceExposure = "INDOOR" | "OUTDOOR" | "MIXED";

export interface PublicSpace {
  id: string;
  name: string;
  description: string;
  address: string;
  zone?: string;
  capacity: number;
  latitude?: number | null;
  longitude?: number | null;
  status: PublicSpaceStatus;
  exposure?: PublicSpaceExposure;
  imageUrl?: string | null;
  createdAt: Date;
}

export interface CreatePublicSpaceData {
  name: string;
  description: string;
  address: string;
  zone?: string;
  capacity: number;
  latitude?: number | null;
  longitude?: number | null;
  status?: PublicSpaceStatus;
  exposure?: PublicSpaceExposure;
  imageUrl?: string | null;
}

export interface UpdatePublicSpaceData {
  name?: string;
  description?: string;
  address?: string;
  zone?: string;
  capacity?: number;
  latitude?: number | null;
  longitude?: number | null;
  status?: PublicSpaceStatus;
  exposure?: PublicSpaceExposure;
  imageUrl?: string | null;
}
