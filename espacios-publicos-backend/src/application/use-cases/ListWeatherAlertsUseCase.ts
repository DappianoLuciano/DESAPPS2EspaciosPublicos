import { WeatherAlertStatus } from "../../domain/entities/WeatherAlert";
import { WeatherAlertRepository } from "../../domain/repositories/WeatherAlertRepository";

export class ListWeatherAlertsUseCase {
  constructor(private readonly repository: WeatherAlertRepository) {}

  execute(status?: WeatherAlertStatus) {
    return this.repository.findMany(status);
  }
}
