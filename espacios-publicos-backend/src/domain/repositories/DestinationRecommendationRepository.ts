import {
  DestinationRecommendation,
  SaveDestinationRecommendationData
} from "../entities/DestinationRecommendation";

export interface DestinationRecommendationRepository {
  findByEventId(eventoId: string): Promise<DestinationRecommendation | null>;
  /**
   * Guarda la recomendacion solo si calculadaEn es mas nuevo que el guardado: el gateway
   * entrega at-least-once y puede hacerlo fuera de orden. Devuelve false si se descarto.
   */
  saveIfNewer(data: SaveDestinationRecommendationData): Promise<boolean>;
}
