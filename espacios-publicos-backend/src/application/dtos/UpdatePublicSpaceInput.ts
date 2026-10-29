export interface UpdatePublicSpaceInput {
  name?: string;
  description?: string;
  address?: string;
  zone?: string;
  capacity?: number;
  latitude?: number | null;
  longitude?: number | null;
  status?: "ENABLED" | "DISABLED";
  exposure?: "INDOOR" | "OUTDOOR" | "MIXED";
  imageUrl?: string | null;
}
