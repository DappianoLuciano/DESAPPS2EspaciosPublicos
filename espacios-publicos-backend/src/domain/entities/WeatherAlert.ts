export type WeatherCriticality = "BAJA" | "MEDIA" | "ALTA" | "CRITICA";
export type WeatherPhenomenon =
  | "TORMENTA_FUERTE" | "LLUVIA_INTENSA" | "VIENTO_FUERTE"
  | "OLA_DE_CALOR" | "OLA_DE_FRIO" | "GRANIZO"
  | "TORMENTA_ELECTRICA" | "HURACAN" | "NIEVE";
export type WeatherAlertStatus = "PENDING" | "CONFIRMED" | "DISMISSED" | "FINALIZED";

export interface WeatherEvidence {
  locations?: Array<{ latitude: number; longitude: number }>;
  provider: "OPEN_METEO" | "MANUAL";
  manual?: { createdBy: string; createdAt: string; reason: string; source: string; locationIds: string[] };
  forecastFrom: string;
  forecastTo: string;
  maxWindGustKmh?: number;
  accumulatedPrecipitationMm?: number;
  temperatureMinC?: number;
  temperatureMaxC?: number;
  weatherCodes: number[];
  evaluatedHours: number;
}

export interface WeatherAlert {
  id: string;
  deduplicationKey: string;
  zone: string;
  latitude: number;
  longitude: number;
  phenomenon: WeatherPhenomenon;
  suggestedCriticality: WeatherCriticality;
  confirmedCriticality?: WeatherCriticality | null;
  status: WeatherAlertStatus;
  validFrom: Date;
  validUntil: Date;
  evidence: WeatherEvidence;
  detectedAt: Date;
  confirmedAt?: Date | null;
  confirmedBy?: string | null;
  dismissedAt?: Date | null;
  dismissedBy?: string | null;
  dismissalReason?: string | null;
  finalizedAt?: Date | null;
  finalizedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWeatherAlertData {
  deduplicationKey: string;
  zone: string;
  latitude: number;
  longitude: number;
  phenomenon: WeatherPhenomenon;
  suggestedCriticality: WeatherCriticality;
  validFrom: Date;
  validUntil: Date;
  evidence: WeatherEvidence;
}
