export type TowInterventionStatus = "PENDING" | "TOW_REQUESTED" | "COMPLETED";

export interface TowIntervention {
  id: string;
  reclamoId: string;
  correlationId: string;
  latitud: number;
  longitud: number;
  direccion: string;
  barrio: string;
  afectaCiclovia: boolean;
  estacionesAfectadasIds: number[];
  impactoCirculacion: string;
  desvioSugerido: string;
  requiereIntervencionInmediata: boolean;
  requiereGrua: boolean;
  patente: string | null;
  status: TowInterventionStatus;
  evaluadoAt: Date;
  solicitadoAt: Date | null;
  resueltoAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTowInterventionData {
  reclamoId: string;
  correlationId: string;
  latitud: number;
  longitud: number;
  direccion: string;
  barrio: string;
  afectaCiclovia: boolean;
  estacionesAfectadasIds: number[];
  impactoCirculacion: string;
  desvioSugerido: string;
  requiereIntervencionInmediata: boolean;
  requiereGrua: boolean;
  evaluadoAt: Date;
}
