export interface CreatePublicSpaceInput {
  name: string;
  description: string;
  address: string;
  zone?: string;
  capacity: number;
  imageUrl?: string | null;
}
