import { CreatePublicSpaceData, PublicSpace } from "../entities/PublicSpace";

export interface PublicSpaceRepository {
  create(data: CreatePublicSpaceData): Promise<PublicSpace>;
  findById(id: string): Promise<PublicSpace | null>;
  findAll(): Promise<PublicSpace[]>;
}
