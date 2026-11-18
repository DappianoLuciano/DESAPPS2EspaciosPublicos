import { TowIntervention } from "../../domain/entities/TowIntervention";
import { TowInterventionRepository } from "../../domain/repositories/TowInterventionRepository";

export class ListTowInterventionsUseCase {
  constructor(private readonly repository: TowInterventionRepository) {}

  async execute(): Promise<TowIntervention[]> {
    return this.repository.findAll();
  }
}
