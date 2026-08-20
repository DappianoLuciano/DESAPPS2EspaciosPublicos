import { DomainEvent } from "../entities/DomainEvent";

// Contrato simple: los casos de uso publican eventos sin conocer Kafka, RabbitMQ ni otra herramienta.
export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
}
