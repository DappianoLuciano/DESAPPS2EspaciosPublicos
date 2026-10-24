import { WeatherAlertRepository } from "../../domain/repositories/WeatherAlertRepository";
import { NotFoundError } from "../../shared/errors/NotFoundError";

export class GetWeatherAlertUseCase {
  constructor(private readonly repository: WeatherAlertRepository) {}

  async execute(id: string) {
    const alert = await this.repository.findById(id);
    if (!alert) throw new NotFoundError("La alerta climatica no existe.");
    return alert;
  }
}
