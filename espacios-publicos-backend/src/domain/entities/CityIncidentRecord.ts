export type CityIncidentSource = "RECLAMOS" | "EMERGENCIAS";

export interface CityIncidentRecord {
  id: string;
  source: CityIncidentSource;
  externalId: string;
  category: string | null;
  latitude: number;
  longitude: number;
  active: boolean;
  reportedAt: Date;
  updatedAt: Date;
}

export interface UpsertCityIncidentData {
  source: CityIncidentSource;
  externalId: string;
  category: string | null;
  latitude: number;
  longitude: number;
}

export interface GeoBounds {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}
