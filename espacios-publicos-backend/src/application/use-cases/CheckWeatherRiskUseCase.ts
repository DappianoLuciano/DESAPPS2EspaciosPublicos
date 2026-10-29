import { createHash } from "crypto";
import { WeatherAlert } from "../../domain/entities/WeatherAlert";
import { WeatherAlertRepository } from "../../domain/repositories/WeatherAlertRepository";
import { WeatherForecastProvider } from "../../domain/services/WeatherForecastProvider";
import { WeatherRiskEvaluator } from "../../domain/services/WeatherRiskEvaluator";

export interface WeatherCheckResult {
  checkedAt: string;
  riskDetected: boolean;
  created: boolean;
  message: string;
  alert?: WeatherAlert;
  alerts?: WeatherAlert[];
}

export class CheckWeatherRiskUseCase {
  constructor(
    private readonly forecastProvider: WeatherForecastProvider,
    private readonly riskEvaluator: WeatherRiskEvaluator,
    private readonly weatherAlertRepository: WeatherAlertRepository
  ) {}

  async execute(): Promise<WeatherCheckResult> {
    const checkedAt = new Date().toISOString();
    const forecasts = this.forecastProvider.getForecasts
      ? await this.forecastProvider.getForecasts()
      : [await this.forecastProvider.getForecast()];
    const groups = new Map<string, { forecast: typeof forecasts[number]; risk: NonNullable<ReturnType<WeatherRiskEvaluator["evaluate"]>>; locations: Array<{ latitude: number; longitude: number }> }>();
    for (const forecast of forecasts) {
      const risk = this.riskEvaluator.evaluate(forecast);
      if (!risk) continue;
      const key = [risk.phenomenon, risk.criticality, risk.validFrom.toISOString(), risk.validUntil.toISOString()].join(":");
      const group = groups.get(key) || { forecast, risk, locations: [] };
      const minimums = [group.risk.evidence.temperatureMinC, risk.evidence.temperatureMinC]
        .filter((value): value is number => typeof value === "number");
      const maximums = [group.risk.evidence.temperatureMaxC, risk.evidence.temperatureMaxC]
        .filter((value): value is number => typeof value === "number");
      if (minimums.length) group.risk.evidence.temperatureMinC = Math.min(...minimums);
      if (maximums.length) group.risk.evidence.temperatureMaxC = Math.max(...maximums);
      if (!group.locations.some((p) => p.latitude === forecast.latitude && p.longitude === forecast.longitude)) {
        group.locations.push({ latitude: forecast.latitude, longitude: forecast.longitude });
      }
      groups.set(key, group);
    }
    if (groups.size === 0) {
      return {
        checkedAt,
        riskDetected: false,
        created: false,
        message: "El pronostico no supera los umbrales configurados."
      };
    }

    const openAlerts = await this.weatherAlertRepository.findMany();
    const alerts: WeatherAlert[] = [];
    let created = false;
    for (const { forecast, risk, locations } of groups.values()) {
    locations.sort((a, b) => a.latitude - b.latitude || a.longitude - b.longitude);
    const locationKey = JSON.stringify(locations);
    const existing = openAlerts.find(
      (alert) =>
        (alert.status === "PENDING" || alert.status === "CONFIRMED") &&
        alert.evidence.provider === "OPEN_METEO" &&
        alert.zone === forecast.zone &&
        alert.phenomenon === risk.phenomenon &&
        alert.suggestedCriticality === risk.criticality &&
        JSON.stringify((alert.evidence.locations || [{ latitude: alert.latitude, longitude: alert.longitude }])
          .slice().sort((a, b) => a.latitude - b.latitude || a.longitude - b.longitude)) === locationKey &&
        alert.validFrom < risk.validUntil &&
        alert.validUntil > risk.validFrom
    );

    if (existing) {
      alerts.push(existing);
      continue;
    }

    const sixHourWindow = Math.floor(risk.validFrom.getTime() / (6 * 60 * 60 * 1000));
    const deduplicationKey = createHash("sha256")
      .update(`${locationKey}:${risk.phenomenon}:${risk.criticality}:${sixHourWindow}`)
      .digest("hex");
    const alert = await this.weatherAlertRepository.create({
      deduplicationKey,
      zone: forecast.zone,
      latitude: forecast.latitude,
      longitude: forecast.longitude,
      phenomenon: risk.phenomenon,
      suggestedCriticality: risk.criticality,
      validFrom: risk.validFrom,
      validUntil: risk.validUntil,
      evidence: { ...risk.evidence, locations }
    });
    alerts.push(alert);
    created = true;
    }

    return {
      checkedAt,
      riskDetected: true,
      created,
      message: created ? "Se crearon alertas pendientes para las ubicaciones con riesgo." : "El riesgo ya esta cubierto por alertas abiertas.",
      alert: alerts[0],
      alerts
    };
  }
}
