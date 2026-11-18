export interface InboundTypeSummary {
  eventType: string;
  count: number;
  lastReceivedAt: Date;
}

export interface InboundEventEntry {
  eventId: string;
  eventType: string;
  receivedAt: Date;
}

export interface OutboxNameSummary {
  name: string;
  published: number;
  pending: number;
  failed: number;
  lastCreatedAt: Date | null;
}

export interface OutboxProblemEntry {
  id: string;
  name: string;
  status: "PENDING" | "FAILED";
  attempts: number;
  lastError: string | null;
  createdAt: Date;
}

/** Una fila del outbox, lo justo para los indicadores. */
export interface OutboxDelivery {
  status: "PENDING" | "PUBLISHED" | "FAILED";
  /** Intentos fallidos (una publicacion exitosa no suma). */
  attempts: number;
  createdAt: Date;
  publishedAt: Date | null;
}

export interface InboundArrival {
  eventType: string;
  receivedAt: Date;
}

/** Lecturas para el panel de integraciones del admin. No modifica nada. */
export interface IntegrationStatusRepository {
  inboundByType(): Promise<InboundTypeSummary[]>;
  recentInbound(limit: number): Promise<InboundEventEntry[]>;
  outboxByName(names: string[]): Promise<OutboxNameSummary[]>;
  outboxProblems(names: string[], limit: number): Promise<OutboxProblemEntry[]>;
  /** Filas despachables creadas o publicadas desde `since`. */
  outboxSince(names: string[], since: Date): Promise<OutboxDelivery[]>;
  inboundSince(since: Date): Promise<InboundArrival[]>;
}
