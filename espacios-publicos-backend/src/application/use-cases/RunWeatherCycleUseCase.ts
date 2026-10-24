import { CheckWeatherRiskUseCase } from "./CheckWeatherRiskUseCase";
import { FinalizeWeatherAlertUseCase } from "./FinalizeWeatherAlertUseCase";
import { PublishPendingOutboxEventsUseCase } from "./PublishPendingOutboxEventsUseCase";
import { WeatherAlertRepository } from "../../domain/repositories/WeatherAlertRepository";
import { ValidationError } from "../../shared/errors/ValidationError";

export class RunWeatherCycleUseCase {
  constructor(
    private readonly checkWeatherRisk: CheckWeatherRiskUseCase,
    private readonly weatherAlertRepository: WeatherAlertRepository,
    private readonly finalizeWeatherAlert: FinalizeWeatherAlertUseCase,
    private readonly publishPending: PublishPendingOutboxEventsUseCase
  ) {}

  async execute() {
    const initialDelivery = await this.publishPending.execute();
    const delivery = { ...initialDelivery };
    const expired = await this.weatherAlertRepository.findExpiredConfirmed(new Date());
    let expiredAlertsFinalized = 0;
    for (const alert of expired) {
      try {
        const result = await this.finalizeWeatherAlert.execute(
          alert.id,
          "system:weather-scheduler"
        );
        expiredAlertsFinalized += 1;
        delivery.processed += result.delivery.processed;
        delivery.published += result.delivery.published;
        delivery.failed += result.delivery.failed;
      } catch (error) {
        // Otro ciclo concurrente puede haber finalizado la misma alerta entre la consulta y el update.
        if (!(error instanceof ValidationError)) throw error;
      }
    }
    const weatherCheck = await this.checkWeatherRisk.execute();
    const finalDelivery = await this.publishPending.execute();
    delivery.processed += finalDelivery.processed;
    delivery.published += finalDelivery.published;
    delivery.failed += finalDelivery.failed;

    return {
      ranAt: new Date().toISOString(),
      expiredAlertsFinalized,
      weatherCheck,
      delivery
    };
  }
}
