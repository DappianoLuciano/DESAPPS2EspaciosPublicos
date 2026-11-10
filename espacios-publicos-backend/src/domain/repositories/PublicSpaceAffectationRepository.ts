export interface ActivePublicSpaceAffectation {
  afectacionId: string;
  espacioId: string;
  correlationId: string;
}

export interface SavePublicSpaceAffectationData extends ActivePublicSpaceAffectation {
  tipoAfectacion: string;
  causaTipo: string | null;
  causaId: string | null;
  desde: Date;
  hastaEstimada: Date | null;
}

/** Que afectaciones vigentes terminar. Los criterios se combinan con AND. */
export interface PublicSpaceAffectationFilter {
  afectacionIds?: string[];
  espacioId?: string;
  causaId?: string;
  /** null = afectaciones sin causa registrada (ej. baja manual del espacio). */
  causaTipos?: Array<string | null>;
}

export interface PublicSpaceAffectationRepository {
  /** Alta o reapertura: el mismo afectacionId vuelve a quedar vigente. */
  saveActive(data: SavePublicSpaceAffectationData): Promise<void>;
  /** Marca como restauradas las vigentes que cumplen el filtro y las devuelve. */
  restore(filter: PublicSpaceAffectationFilter, restoredAt: Date): Promise<ActivePublicSpaceAffectation[]>;
}
