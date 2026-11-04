import { SpaceProblemRecord } from "../../domain/entities/EmergencyImpact";
import { EmergencyImpactRepository } from "../../domain/repositories/EmergencyImpactRepository";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ValidationError } from "../../shared/errors/ValidationError";
import { requireText } from "../../shared/validation/inputValidation";

/** A6: deriva la atencion de la problematica. El evento ya salio al registrarla. */
export class DeriveSpaceProblemUseCase {
  constructor(
    private readonly impacts: Pick<EmergencyImpactRepository, "findProblemById" | "deriveProblem">
  ) {}

  async execute(id: unknown, derivedTo: unknown, actor: string): Promise<SpaceProblemRecord> {
    const problemId = requireText(id, "La problematica", 128);
    const area = requireText(derivedTo, "El area", 120);
    const problem = await this.impacts.findProblemById(problemId);

    if (!problem) {
      throw new NotFoundError("La problematica indicada no existe.");
    }

    if (problem.status === "DERIVADA") {
      throw new ValidationError("La problematica ya fue derivada.");
    }

    return this.impacts.deriveProblem(problemId, area, actor, new Date());
  }
}
