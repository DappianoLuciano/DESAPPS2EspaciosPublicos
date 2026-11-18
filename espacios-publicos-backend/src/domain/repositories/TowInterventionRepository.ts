import {
  CreateTowInterventionData,
  TowIntervention
} from "../entities/TowIntervention";

export interface TowInterventionRepository {
  create(data: CreateTowInterventionData): Promise<TowIntervention>;
  findAll(): Promise<TowIntervention[]>;
  findById(id: string): Promise<TowIntervention | null>;
  findByReclamoId(reclamoId: string): Promise<TowIntervention | null>;
  update(intervention: TowIntervention): Promise<TowIntervention>;
}
