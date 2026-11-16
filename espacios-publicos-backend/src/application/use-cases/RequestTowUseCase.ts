import { TowIntervention } from "../../domain/entities/TowIntervention";
import { TowInterventionRepository } from "../../domain/repositories/TowInterventionRepository";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ValidationError } from "../../shared/errors/ValidationError";
import { requireText } from "../../shared/validation/inputValidation";
import { RequestTowInput } from "../dtos/RequestTowInput";

type Clock = () => Date;

export class RequestTowUseCase {
  constructor(
    private readonly repository: TowInterventionRepository,
    private readonly clock: Clock = () => new Date()
  ) {}

  async execute(input: RequestTowInput): Promise<TowIntervention> {
    const interventionId = requireText(
      input.interventionId,
      "La intervencion",
      128
    );
    const patente = normalizePatente(input.patente);
    const intervention = await this.repository.findById(interventionId);

    if (!intervention) {
      throw new NotFoundError("La intervencion indicada no existe.");
    }

    if (!intervention.requiereGrua) {
      throw new ValidationError("La intervencion no requiere una grua.");
    }

    if (intervention.status !== "PENDING") {
      throw new ValidationError("La grua ya fue solicitada para esta intervencion.");
    }

    return this.repository.update({
      ...intervention,
      patente,
      status: "TOW_REQUESTED",
      solicitadoAt: this.clock()
    });
  }
}

function normalizePatente(value: string): string {
  const patente = requireText(value, "La patente", 16)
    .toUpperCase()
    .replace(/[\s-]/g, "");

  if (!/^[A-Z0-9]{6,10}$/.test(patente)) {
    throw new ValidationError("La patente indicada no es valida.");
  }

  return patente;
}
