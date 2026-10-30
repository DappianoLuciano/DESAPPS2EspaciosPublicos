export interface WeatherForecastPoint {
  time: Date;
  precipitationMm: number;
  windGustKmh: number;
  weatherCode: number;
  temperatureC?: number;
}

export interface WeatherForecast {
  provider: "OPEN_METEO";
  zone: string;
  latitude: number;
  longitude: number;
  points: WeatherForecastPoint[];
  heatPoints?: WeatherForecastPoint[];
}

export interface WeatherForecastProvider {
  getForecast(): Promise<WeatherForecast>;
  getForecasts?(): Promise<WeatherForecast[]>;
}
