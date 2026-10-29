import { WeatherAlertRepository } from "../../domain/repositories/WeatherAlertRepository";
import { requireText } from "../../shared/validation/inputValidation";

export class DismissWeatherAlertUseCase {
  constructor(private readonly repository: WeatherAlertRepository) {}

  execute(alertId: string, reason: string, actorSub: string) {
    return this.repository.dismiss(
      requireText(alertId, "La alerta", 128),
      requireText(reason, "El motivo del descarte", 500),
      requireText(actorSub, "El administrador", 160)
    );
  }
}
