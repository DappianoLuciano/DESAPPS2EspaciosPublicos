export interface CreatePublicSpaceInput {
  name: string;
  description: string;
  address: string;
  zone?: string;
  capacity: number;
  latitude?: number | null;
  longitude?: number | null;
  status?: "ENABLED" | "DISABLED";
  imageUrl?: string | null;
}
