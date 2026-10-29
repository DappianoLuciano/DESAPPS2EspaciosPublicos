import { DomainEvent } from "../../src/domain/entities/DomainEvent";
import { OutboxEvent } from "../../src/domain/entities/OutboxEvent";
import { ReliableEventOutboxRepository } from "../../src/domain/repositories/ReliableEventOutboxRepository";
import { EventBus } from "../../src/domain/services/EventBus";
import { PublishPendingOutboxEventsUseCase } from "../../src/application/use-cases/PublishPendingOutboxEventsUseCase";

class FakeOutbox implements ReliableEventOutboxRepository {
  events: OutboxEvent[] = [];
  published: string[] = [];
  failed: string[] = [];

  async save(): Promise<void> {}
  async findReady(): Promise<OutboxEvent[]> { return this.events; }
  async markPublished(id: string): Promise<void> { this.published.push(id); }
  async markFailed(id: string): Promise<void> { this.failed.push(id); }
  async markExhausted(id: string): Promise<void> { this.failed.push(id); }
}

class FakeBus implements EventBus {
  shouldFail = false;
  async publish(_event: DomainEvent): Promise<void> {
    if (this.shouldFail) throw new Error("gateway caido");
  }
}

function outboxEvent(): OutboxEvent {
  return {
    id: "event-1",
    name: "com.citypass.espacios.CriticidadClimaticaConfirmada",
    payload: { alertaId: "alert-1" },
    occurredAt: new Date(),
    status: "PENDING",
    attempts: 0
  };
}

describe("PublishPendingOutboxEventsUseCase", () => {
  it("marca como publicado cuando el bus acepta el evento", async () => {
    const repository = new FakeOutbox();
    repository.events = [outboxEvent()];
    const result = await new PublishPendingOutboxEventsUseCase(repository, new FakeBus()).execute();

    expect(result).toEqual({ processed: 1, published: 1, failed: 0 });
    expect(repository.published).toEqual(["event-1"]);
  });

  it("mantiene el evento para reintento cuando el bus falla", async () => {
    const repository = new FakeOutbox();
    repository.events = [outboxEvent()];
    const bus = new FakeBus();
    bus.shouldFail = true;
    const result = await new PublishPendingOutboxEventsUseCase(repository, bus).execute();

    expect(result).toEqual({ processed: 1, published: 0, failed: 1 });
    expect(repository.failed).toEqual(["event-1"]);
  });
});
