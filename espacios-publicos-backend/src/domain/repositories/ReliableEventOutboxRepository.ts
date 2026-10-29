import { EventOutboxRepository } from "./EventOutboxRepository";
import { OutboxEvent } from "../entities/OutboxEvent";

export interface ReliableEventOutboxRepository extends EventOutboxRepository {
  findReady(limit: number, now: Date): Promise<OutboxEvent[]>;
  markPublished(id: string, publishedAt: Date): Promise<void>;
  markFailed(id: string, error: string, nextAttemptAt: Date): Promise<void>;
}
