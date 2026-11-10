export interface BikeStationRecord {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  availableBikes: number | null;
  availableSlots: number | null;
  capacity: number | null;
  active: boolean;
  /** Momento del dato segun Movilidad. */
  updatedAt: Date;
}

export interface BikeStationRepository {
  /** Guarda la estacion salvo que ya tengamos un dato mas nuevo. Devuelve si la guardo. */
  saveIfNewer(station: BikeStationRecord): Promise<boolean>;
  findActive(): Promise<BikeStationRecord[]>;
}
