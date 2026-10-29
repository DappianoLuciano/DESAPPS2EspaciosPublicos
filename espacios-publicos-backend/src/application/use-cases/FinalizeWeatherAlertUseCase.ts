import { randomUUID } from "crypto";
import { DomainEvent } from "../../domain/entities/DomainEvent";
import { WeatherAlertRepository } from "../../domain/repositories/WeatherAlertRepository";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { requireText } from "../../shared/validation/inputValidation";
import { PublishPendingOutboxEventsUseCase } from "./PublishPendingOutboxEventsUseCase";

export class FinalizeWeatherAlertUseCase {
  constructor(
    private readonly repository: WeatherAlertRepository,
    private readonly publishPending: PublishPendingOutboxEventsUseCase
  ) {}

  async execute(alertIdValue: string, actorSubValue: string) {
    const alertId = requireText(alertIdValue, "La alerta", 128);
    const actorSub = requireText(actorSubValue, "El administrador", 160);
    const current = await this.repository.findById(alertId);
    if (!current) throw new NotFoundError("La alerta climatica no existe.");
    const occurredAt = new Date();
    const event: DomainEvent = {
      id: randomUUID(),
      name:
        process.env.WEATHER_FINALIZED_EVENT_FQN?.trim() ||
        "com.citypass.espacios.CriticidadClimaticaFinalizada",
      payload: {
        alertaId: current.id,
        finalizadaEn: occurredAt.getTime(),
        actorSub
      },
      occurredAt
    };
    const alert = await this.repository.finalizeWithEvent(current.id, actorSub, event);
    const delivery = await this.publishPending.execute();
    return { alert, delivery };
  }
}
