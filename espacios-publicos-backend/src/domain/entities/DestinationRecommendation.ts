export type DestinationRecommendationStatus = "RECOMMENDED" | "NO_RECOMMENDATION";

// Los nombres de campo son los del evento RecomendacionDestinoActualizada de Movilidad.
export interface DestinationRecommendation {
  eventoId: string;
  estado: DestinationRecommendationStatus;
  /** Movilidad lo manda como numero (long); se guarda como string. */
  estacionId: string | null;
  estacion: string | null;
  latitud: number | null;
  longitud: number | null;
  lugaresLibres: number | null;
  distanciaMetros: number | null;
  mensaje: string;
  descartadasPorIncidentes: number;
  calculadaEn: Date;
  correlationId: string | null;
  receivedAt: Date;
}

export type SaveDestinationRecommendationData = Omit<DestinationRecommendation, "receivedAt">;
