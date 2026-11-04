import { randomUUID } from "crypto";
import { DomainEvent } from "../../domain/entities/DomainEvent";
import { WeatherCriticality } from "../../domain/entities/WeatherAlert";
import { WeatherAlertRepository } from "../../domain/repositories/WeatherAlertRepository";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ValidationError } from "../../shared/errors/ValidationError";
import { requireText } from "../../shared/validation/inputValidation";
import { resolveWeatherNeighborhoods } from "../../domain/services/resolveWeatherNeighborhoods";
import { PublishPendingOutboxEventsUseCase } from "./PublishPendingOutboxEventsUseCase";

const validCriticalities: WeatherCriticality[] = ["BAJA", "MEDIA", "ALTA", "CRITICA"];

export interface ConfirmWeatherAlertInput {
  alertId: string;
  criticality: WeatherCriticality;
  validUntil: string;
  actorSub: string;
}

export class ConfirmWeatherAlertUseCase {
  constructor(
    private readonly repository: WeatherAlertRepository,
    private readonly publishPending: PublishPendingOutboxEventsUseCase
  ) {}

  async execute(input: ConfirmWeatherAlertInput) {
    const alertId = requireText(input.alertId, "La alerta", 128);
    const actorSub = requireText(input.actorSub, "El administrador", 160);
    if (!validCriticalities.includes(input.criticality)) {
      throw new ValidationError("El nivel de criticidad no es valido.");
    }
    const validUntil = new Date(requireText(input.validUntil, "La vigencia", 64));
    if (Number.isNaN(validUntil.getTime()) || validUntil <= new Date()) {
      throw new ValidationError("La vigencia de la alerta debe ser una fecha futura.");
    }

    const current = await this.repository.findById(alertId);
    if (!current) throw new NotFoundError("La alerta climatica no existe.");
    if (validUntil <= current.validFrom) {
      throw new ValidationError("La vigencia debe terminar despues del inicio del riesgo detectado.");
    }
    const occurredAt = new Date();
    const event: DomainEvent = {
      id: randomUUID(),
      name:
        process.env.WEATHER_CONFIRMED_EVENT_FQN?.trim() ||
        "com.citypass.espacios.CriticidadClimaticaConfirmada",
      payload: {
        alertaId: current.id,
        nivelCriticidad: input.criticality,
        fenomeno: current.phenomenon,
        ubicaciones: (current.evidence.locations || [{ latitude: current.latitude, longitude: current.longitude }])
          .map((point) => ({ latitud: point.latitude, longitud: point.longitude })),
        barrios: resolveWeatherNeighborhoods(current.evidence.locations ||
          [{ latitude: current.latitude, longitude: current.longitude }]),
        vigenciaDesde: current.validFrom.getTime(),
        vigenciaHasta: validUntil.getTime(),
        temperaturaMinC: current.evidence.temperatureMinC ?? null,
        temperaturaMaxC: current.evidence.temperatureMaxC ?? null,
        actorSub
      },
      occurredAt
    };

    const alert = await this.repository.confirmWithEvent(
      current.id,
      input.criticality,
      validUntil,
      actorSub,
      event
    );
    const delivery = await this.publishPending.execute();
    return { alert, delivery };
  }
}
