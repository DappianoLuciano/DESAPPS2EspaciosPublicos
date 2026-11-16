export interface MovilidadObstruccionEvaluadaInput {
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
  evaluadoAt: number;
}
