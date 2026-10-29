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
}
