import { TowIntervention } from "../../domain/entities/TowIntervention";
import { TowInterventionRepository } from "../../domain/repositories/TowInterventionRepository";
import { EventOutboxRepository } from "../../domain/repositories/EventOutboxRepository";
import { EventBus } from "../../domain/services/EventBus";
import { createIntervencionFinalizadaEvent } from "../../domain/events/IntervencionFinalizadaEvent";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ValidationError } from "../../shared/errors/ValidationError";
import { requireText } from "../../shared/validation/inputValidation";
import { CompleteTowServiceInput } from "../dtos/CompleteTowServiceInput";

type Clock = () => Date;

export class CompleteTowServiceUseCase {
  constructor(
    private readonly repository: TowInterventionRepository,
    private readonly eventOutboxRepository: EventOutboxRepository,
    private readonly eventBus: EventBus,
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

    const completed = await this.repository.update({
      ...intervention,
      status: "COMPLETED",
      resueltoAt: this.clock()
    });

    const event = createIntervencionFinalizadaEvent(completed);
    await this.eventOutboxRepository.save(event);
    await this.eventBus.publish(event);

    return completed;
  }
}
