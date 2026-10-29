import { DomainEvent } from "./DomainEvent";

export type OutboxStatus = "PENDING" | "PUBLISHED" | "FAILED";

export interface OutboxEvent extends DomainEvent {
  status: OutboxStatus;
  attempts: number;
  nextAttemptAt?: Date | null;
  lastError?: string | null;
  publishedAt?: Date | null;
}
