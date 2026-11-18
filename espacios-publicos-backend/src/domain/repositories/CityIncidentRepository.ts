import {
  CityIncidentRecord,
  CityIncidentSource,
  GeoBounds,
  UpsertCityIncidentData
} from "../entities/CityIncidentRecord";

export interface CityIncidentRepository {
  /** Alta o reactivacion: el mismo (source, externalId) nunca se duplica. */
  upsertActive(data: UpsertCityIncidentData): Promise<void>;
  /** Cierre. Si el incidente nunca se registro, no hace nada. */
  deactivate(source: CityIncidentSource, externalId: string): Promise<void>;
  findActiveInBounds(bounds: GeoBounds): Promise<CityIncidentRecord[]>;
  /**
   * Activos sin coordenadas que tienen barrio. La comparacion con la zona del espacio
   * (sin tildes ni mayusculas) la hace quien llama.
   */
  findActiveWithoutCoordinatesWithZone(): Promise<CityIncidentRecord[]>;
  /** Activos de un modulo de origen, el mas reciente primero. */
  findActiveBySource(source: CityIncidentSource): Promise<CityIncidentRecord[]>;
  findActive(source: CityIncidentSource, externalId: string): Promise<CityIncidentRecord | null>;
}
