import { CreatePublicSpaceData, PublicSpace, PublicSpaceStatus, UpdatePublicSpaceData } from "../entities/PublicSpace";

export interface PublicSpaceFilters {
  status?: PublicSpaceStatus;
}

export interface PublicSpaceRepository {
  create(data: CreatePublicSpaceData): Promise<PublicSpace>;
  findById(id: string): Promise<PublicSpace | null>;
  findAll(filters?: PublicSpaceFilters): Promise<PublicSpace[]>;
  update(id: string, data: UpdatePublicSpaceData): Promise<PublicSpace>;
  delete(id: string): Promise<void>;
}
