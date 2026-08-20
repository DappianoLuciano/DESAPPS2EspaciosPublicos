export interface CreatePublicSpaceInput {
  name: string;
  description: string;
  address: string;
  capacity: number;
  imageUrl?: string | null;
}
