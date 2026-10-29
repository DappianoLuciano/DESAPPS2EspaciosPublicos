import {
  WeatherForecast,
  WeatherForecastPoint,
  WeatherForecastProvider
} from "../../domain/services/WeatherForecastProvider";
import { AppError } from "../../shared/errors/AppError";
import { WeatherLocationConfig } from "./weatherConfig";

interface OpenMeteoResponse {
  hourly?: {
    time?: unknown[];
    precipitation?: unknown[];
    wind_gusts_10m?: unknown[];
    weather_code?: unknown[];
    temperature_2m?: unknown[];
  };
}

export class OpenMeteoWeatherProvider implements WeatherForecastProvider {
  constructor(
    private readonly location: WeatherLocationConfig,
    private readonly baseUrl = process.env.OPEN_METEO_URL?.trim() || "https://api.open-meteo.com/v1/forecast"
  ) {}

  async getForecast(): Promise<WeatherForecast> {
    return (await this.getForecasts())[0];
  }

  async getForecasts(): Promise<WeatherForecast[]> {
    const locations = this.location.locations || [this.location];
    const url = new URL(this.baseUrl);
    url.searchParams.set("latitude", locations.map((point) => point.latitude).join(","));
    url.searchParams.set("longitude", locations.map((point) => point.longitude).join(","));
    url.searchParams.set("hourly", "precipitation,weather_code,wind_gusts_10m,temperature_2m");
    url.searchParams.set("temperature_unit", "celsius");
    url.searchParams.set("forecast_hours", String(this.location.forecastHours));
    url.searchParams.set("timeformat", "unixtime");
    url.searchParams.set("timezone", "America/Argentina/Buenos_Aires");

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10_000)
      });
    } catch {
      throw new AppError("No se pudo conectar con el proveedor meteorologico.", 502);
    }

    if (!response.ok) {
      throw new AppError(`El proveedor meteorologico respondio con estado ${response.status}.`, 502);
    }

    const body = (await response.json()) as OpenMeteoResponse | OpenMeteoResponse[];
    const responses = Array.isArray(body) ? body : [body];
    if (responses.length !== locations.length) {
      throw new AppError("El proveedor no devolvio todas las ubicaciones solicitadas.", 502);
    }
    return responses.map((item, index) => {
    const points = this.parsePoints(item);

    if (points.length === 0) {
      throw new AppError("El proveedor meteorologico no devolvio un pronostico utilizable.", 502);
    }

    return {
      provider: "OPEN_METEO",
      zone: this.location.zone,
      latitude: locations[index].latitude,
      longitude: locations[index].longitude,
      points
    };
    });
  }

  private parsePoints(body: OpenMeteoResponse): WeatherForecastPoint[] {
    const times = body.hourly?.time;
    const precipitation = body.hourly?.precipitation;
    const gusts = body.hourly?.wind_gusts_10m;
    const codes = body.hourly?.weather_code;

    if (!times || !precipitation || !gusts || !codes) {
      return [];
    }

    const length = Math.min(times.length, precipitation.length, gusts.length, codes.length);
    const points: WeatherForecastPoint[] = [];

    for (let index = 0; index < length; index += 1) {
      const unixSeconds = Number(times[index]);
      const precipitationMm = Number(precipitation[index]);
      const windGustKmh = Number(gusts[index]);
      const weatherCode = Number(codes[index]);

      if (
        !Number.isFinite(unixSeconds) ||
        !Number.isFinite(precipitationMm) ||
        !Number.isFinite(windGustKmh) ||
        !Number.isFinite(weatherCode)
      ) {
        continue;
      }

      points.push({
        time: new Date(unixSeconds * 1000),
        precipitationMm,
        windGustKmh,
        weatherCode,
        ...(typeof body.hourly?.temperature_2m?.[index] === "number" &&
          Number.isFinite(body.hourly.temperature_2m[index])
          ? { temperatureC: body.hourly.temperature_2m[index] as number } : {})
      });
    }

    return points;
  }
}
