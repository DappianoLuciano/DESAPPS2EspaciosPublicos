export interface CreatePublicSpaceInput {
  name: string;
  description: string;
  address: string;
  zone?: string;
  capacity: number;
  status?: "ENABLED" | "DISABLED";
  imageUrl?: string | null;
}
