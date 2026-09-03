import { DomainEvent } from "../entities/DomainEvent";

export interface EventOutboxRepository {
  save(event: DomainEvent): Promise<void>;
}
