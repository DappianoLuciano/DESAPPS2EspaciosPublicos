import { EventOutboxRepository } from "./EventOutboxRepository";
import { OutboxEvent } from "../entities/OutboxEvent";

export interface ReliableEventOutboxRepository extends EventOutboxRepository {
  /** Filas PENDING cuyo proximo intento ya vencio. Las FAILED (terminales) no se devuelven. */
  findReady(limit: number, now: Date): Promise<OutboxEvent[]>;
  markPublished(id: string, publishedAt: Date): Promise<void>;
  /** Un intento fallo: suma el intento y deja la fila PENDING para reintentarla en nextAttemptAt. */
  markFailed(id: string, error: string, nextAttemptAt: Date): Promise<void>;
  /** Se alcanzo el tope de intentos: la fila queda FAILED y no se vuelve a despachar. */
  markExhausted(id: string, error: string): Promise<void>;
}
