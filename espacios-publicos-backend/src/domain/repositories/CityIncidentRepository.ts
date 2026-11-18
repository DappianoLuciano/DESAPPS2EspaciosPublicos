import {
  CityIncidentRecord,
  CityIncidentSource,
  GeoBounds,
  UpsertCityIncidentData
} from "../entities/CityIncidentRecord";

export interface CityIncidentRepository {
  /**
   * Alta o reactivacion: el mismo (source, externalId) nunca se duplica. Un incidente con cierre
   * definitivo no se reactiva: el bus no garantiza el orden y el alta puede llegar despues del cierre.
   */
  upsertActive(data: UpsertCityIncidentData): Promise<void>;
  /**
   * Cierre definitivo (resuelta, cerrada, cancelada, intervencion finalizada). Si el incidente todavia
   * no se registro, deja el cierre anotado para que el alta que llegue despues no lo active.
   */
  deactivate(source: CityIncidentSource, externalId: string): Promise<void>;
  /** Baja temporal: un reclamo reclasificado que deja de cortar la circulacion. Puede volver a activarse. */
  deactivateUntilReactivated(source: CityIncidentSource, externalId: string): Promise<void>;
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
