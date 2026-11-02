import { WeatherRiskThresholds } from "../../domain/services/WeatherRiskEvaluator";

function numberFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

export interface WeatherLocationConfig {
  locations?: Array<{ latitude: number; longitude: number }>;
  zone: string;
  latitude: number;
  longitude: number;
  forecastHours: number;
}

export function getWeatherLocationConfig(): WeatherLocationConfig {
  const raw = process.env.WEATHER_LOCATIONS?.trim();
  const locations: Array<{ latitude: number; longitude: number }> | undefined = raw ? JSON.parse(raw) : undefined;
  if (locations && (!Array.isArray(locations) || locations.length === 0 ||
    locations.some((point) => !point || !Number.isFinite(point.latitude) ||
      !Number.isFinite(point.longitude) || Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180))) {
    throw new Error("WEATHER_LOCATIONS debe contener coordenadas validas.");
  }
  return {
    locations,
    zone: process.env.WEATHER_ZONE?.trim() || "CABA",
    latitude: numberFromEnv("WEATHER_LATITUDE", -34.6037),
    longitude: numberFromEnv("WEATHER_LONGITUDE", -58.3816),
    forecastHours: Math.max(1, Math.min(72, numberFromEnv("WEATHER_FORECAST_HOURS", 24)))
  };
}

export function getWeatherRiskThresholds(): WeatherRiskThresholds {
  return {
    lowWindGustKmh: numberFromEnv("WEATHER_LOW_WIND_GUST_KMH", 35),
    heatDailyMinC: numberFromEnv("WEATHER_HEAT_DAILY_MIN_C", 22),
    heatDailyMaxC: numberFromEnv("WEATHER_HEAT_DAILY_MAX_C", 32),
    mediumWindGustKmh: numberFromEnv("WEATHER_MEDIUM_WIND_GUST_KMH", 50),
    highWindGustKmh: numberFromEnv("WEATHER_HIGH_WIND_GUST_KMH", 70),
    criticalWindGustKmh: numberFromEnv("WEATHER_CRITICAL_WIND_GUST_KMH", 100),
    lowPrecipitationMm: numberFromEnv("WEATHER_LOW_PRECIPITATION_MM", 5),
    mediumPrecipitationMm: numberFromEnv("WEATHER_MEDIUM_PRECIPITATION_MM", 20),
    highPrecipitationMm: numberFromEnv("WEATHER_HIGH_PRECIPITATION_MM", 40),
    criticalPrecipitationMm: numberFromEnv("WEATHER_CRITICAL_PRECIPITATION_MM", 80)
  };
}
