import {
  WeatherCriticality,
  WeatherEvidence,
  WeatherPhenomenon
} from "../entities/WeatherAlert";
import { WeatherForecast } from "./WeatherForecastProvider";

export interface WeatherRiskThresholds {
  lowWindGustKmh: number;
  mediumWindGustKmh: number;
  highWindGustKmh: number;
  criticalWindGustKmh: number;
  lowPrecipitationMm: number;
  mediumPrecipitationMm: number;
  highPrecipitationMm: number;
  criticalPrecipitationMm: number;
}

export interface EvaluatedWeatherRisk {
  criticality: WeatherCriticality;
  phenomenon: WeatherPhenomenon;
  validFrom: Date;
  validUntil: Date;
  evidence: WeatherEvidence;
}

const rank: Record<WeatherCriticality, number> = {
  BAJA: 1,
  MEDIA: 2,
  ALTA: 3,
  CRITICA: 4
};

export class WeatherRiskEvaluator {
  constructor(private readonly thresholds: WeatherRiskThresholds) {}

  evaluate(forecast: WeatherForecast): EvaluatedWeatherRisk | null {
    if (forecast.points.length === 0) {
      return null;
    }

    const maxWindGustKmh = Math.max(...forecast.points.map((point) => point.windGustKmh));
    const accumulatedPrecipitationMm = forecast.points.reduce(
      (total, point) => total + point.precipitationMm,
      0
    );
    const weatherCodes = Array.from(new Set(forecast.points.map((point) => point.weatherCode)));
    const temperatures = forecast.points.map((point) => point.temperatureC)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

    const windCriticality = this.evaluateMetric(maxWindGustKmh, [
      this.thresholds.lowWindGustKmh,
      this.thresholds.mediumWindGustKmh,
      this.thresholds.highWindGustKmh,
      this.thresholds.criticalWindGustKmh
    ]);
    const rainCriticality = this.evaluateMetric(accumulatedPrecipitationMm, [
      this.thresholds.lowPrecipitationMm,
      this.thresholds.mediumPrecipitationMm,
      this.thresholds.highPrecipitationMm,
      this.thresholds.criticalPrecipitationMm
    ]);

    const candidates: Array<{
      phenomenon: WeatherPhenomenon;
      criticality: WeatherCriticality | null;
    }> = [
      { phenomenon: "GRANIZO", criticality: weatherCodes.some((code) => code === 96 || code === 99) ? "CRITICA" : null },
      { phenomenon: "TORMENTA_ELECTRICA", criticality: weatherCodes.includes(95) ? "ALTA" : null },
      { phenomenon: "NIEVE", criticality: this.evaluateSnowCodes(weatherCodes) },
      { phenomenon: "VIENTO_FUERTE", criticality: windCriticality },
      { phenomenon: "LLUVIA_INTENSA", criticality: rainCriticality || (weatherCodes.some((code) => code >= 80 && code <= 82) ? "BAJA" : null) }
    ];
    const selected = candidates
      .filter((candidate): candidate is { phenomenon: WeatherPhenomenon; criticality: WeatherCriticality } =>
        candidate.criticality !== null
      )
      .sort((left, right) => rank[right.criticality] - rank[left.criticality])[0];

    if (!selected) {
      return null;
    }

    const firstPoint = forecast.points[0];
    const lastPoint = forecast.points[forecast.points.length - 1];
    const validUntil = new Date(lastPoint.time.getTime() + 60 * 60 * 1000);

    return {
      criticality: selected.criticality,
      phenomenon: selected.phenomenon,
      validFrom: firstPoint.time,
      validUntil,
      evidence: {
        provider: forecast.provider,
        forecastFrom: firstPoint.time.toISOString(),
        forecastTo: lastPoint.time.toISOString(),
        maxWindGustKmh,
        accumulatedPrecipitationMm: Number(accumulatedPrecipitationMm.toFixed(2)),
        weatherCodes,
        evaluatedHours: forecast.points.length,
        ...(temperatures.length ? {
          temperatureMinC: Math.min(...temperatures),
          temperatureMaxC: Math.max(...temperatures)
        } : {})
      }
    };
  }

  private evaluateMetric(value: number, thresholds: [number, number, number, number]): WeatherCriticality | null {
    if (value >= thresholds[3]) return "CRITICA";
    if (value >= thresholds[2]) return "ALTA";
    if (value >= thresholds[1]) return "MEDIA";
    if (value >= thresholds[0]) return "BAJA";
    return null;
  }

  // Niveles técnicos de demostración; requieren acuerdo con el negocio.
  private evaluateSnowCodes(codes: number[]): WeatherCriticality | null {
    if (codes.some((code) => code === 75 || code === 86)) return "ALTA";
    if (codes.includes(73)) return "MEDIA";
    if (codes.some((code) => code === 71 || code === 77 || code === 85)) return "BAJA";
    return null;
  }
}
