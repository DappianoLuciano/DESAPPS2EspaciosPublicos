export type CityIncidentSource = "RECLAMOS" | "EMERGENCIAS";

export interface CityIncidentRecord {
  id: string;
  source: CityIncidentSource;
  externalId: string;
  category: string | null;
  /** null cuando el modulo de origen solo informa el barrio (emergencias sin coordenadas en claro). */
  latitude: number | null;
  longitude: number | null;
  /** Barrio informado por el modulo de origen, tal como llego. */
  zone: string | null;
  active: boolean;
  reportedAt: Date;
  updatedAt: Date;
}

export interface UpsertCityIncidentData {
  source: CityIncidentSource;
  externalId: string;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
  zone: string | null;
}

export interface GeoBounds {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}
