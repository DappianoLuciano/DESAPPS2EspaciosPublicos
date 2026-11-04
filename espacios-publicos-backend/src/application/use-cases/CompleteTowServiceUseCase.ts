import { TowIntervention } from "../../domain/entities/TowIntervention";
import { TowInterventionRepository } from "../../domain/repositories/TowInterventionRepository";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ValidationError } from "../../shared/errors/ValidationError";
import { requireText } from "../../shared/validation/inputValidation";
import { CompleteTowServiceInput } from "../dtos/CompleteTowServiceInput";

type Clock = () => Date;

export class CompleteTowServiceUseCase {
  constructor(
    private readonly repository: TowInterventionRepository,
    private readonly clock: Clock = () => new Date()
  ) {}

  async execute(input: CompleteTowServiceInput): Promise<TowIntervention> {
    const interventionId = requireText(
      input.interventionId,
      "La intervencion",
      128
    );
    const intervention = await this.repository.findById(interventionId);

    if (!intervention) {
      throw new NotFoundError("La intervencion indicada no existe.");
    }

    if (!intervention.requiereGrua) {
      throw new ValidationError("La intervencion no requiere una grua.");
    }

    if (
      intervention.status !== "TOW_REQUESTED" ||
      !intervention.solicitadoAt
    ) {
      throw new ValidationError(
        "La grua debe estar solicitada antes de finalizar el servicio."
      );
    }

    return this.repository.update({
      ...intervention,
      status: "COMPLETED",
      resueltoAt: this.clock()
    });
  }
}
