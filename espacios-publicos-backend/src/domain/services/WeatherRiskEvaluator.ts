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
  heatDailyMinC?: number;
  heatDailyMaxC?: number;
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
    const heatWindow = this.findHeatWindow(forecast);

    const candidates: Array<{
      phenomenon: WeatherPhenomenon;
      criticality: WeatherCriticality | null;
    }> = [
      { phenomenon: "GRANIZO", criticality: weatherCodes.some((code) => code === 96 || code === 99) ? "CRITICA" : null },
      { phenomenon: "TORMENTA_ELECTRICA", criticality: weatherCodes.includes(95) ? "ALTA" : null },
      { phenomenon: "OLA_DE_CALOR", criticality: heatWindow ? "ALTA" : null },
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

    const selectedPoints = selected.phenomenon === "OLA_DE_CALOR" && heatWindow ? heatWindow : forecast.points;
    const firstPoint = selectedPoints[0];
    const lastPoint = selectedPoints[selectedPoints.length - 1];
    const selectedTemperatures = selectedPoints.map((point) => point.temperatureC)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
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
        maxWindGustKmh: Math.max(...selectedPoints.map((point) => point.windGustKmh)),
        accumulatedPrecipitationMm: Number(selectedPoints.reduce((sum, point) => sum + point.precipitationMm, 0).toFixed(2)),
        weatherCodes: Array.from(new Set(selectedPoints.map((point) => point.weatherCode))),
        evaluatedHours: selectedPoints.length,
        ...(selectedTemperatures.length ? {
          temperatureMinC: Math.min(...selectedTemperatures),
          temperatureMaxC: Math.max(...selectedTemperatures)
        } : {})
      }
    };
  }

  private findHeatWindow(forecast: WeatherForecast) {
    const points = (forecast.heatPoints || forecast.points).slice()
      .sort((a, b) => a.time.getTime() - b.time.getTime());
    const minThreshold = this.thresholds.heatDailyMinC ?? 22;
    const maxThreshold = this.thresholds.heatDailyMaxC ?? 32;
    // Regla técnica: tres bloques consecutivos de 24 h, no días civiles ni alerta oficial SMN.
    for (let start = 0; start + 72 <= points.length; start += 1) {
      const window = points.slice(start, start + 72);
      if (window.some((point, index) =>
        typeof point.temperatureC !== "number" || !Number.isFinite(point.temperatureC) ||
        (index > 0 && point.time.getTime() - window[index - 1].time.getTime() !== 3600_000))) continue;
      let sustained = true;
      for (let day = 0; day < 3; day += 1) {
        const values = window.slice(day * 24, (day + 1) * 24).map((point) => point.temperatureC!);
        if (Math.min(...values) < minThreshold || Math.max(...values) < maxThreshold) {
          sustained = false;
          break;
        }
      }
      if (sustained) return window;
    }
    return null;
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
