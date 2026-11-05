export type PublicSpaceStatus = "ENABLED" | "DISABLED";
export type PublicSpaceExposure = "INDOOR" | "OUTDOOR" | "MIXED";
export type PublicSpaceCategory = "PLAZA" | "SALON" | "CANCHA" | "AUDITORIO";
export const PUBLIC_SPACE_CATEGORIES: readonly PublicSpaceCategory[] = ["PLAZA", "SALON", "CANCHA", "AUDITORIO"];

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
  category?: PublicSpaceCategory | null;
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
  category?: PublicSpaceCategory | null;
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
  category?: PublicSpaceCategory | null;
  imageUrl?: string | null;
}
