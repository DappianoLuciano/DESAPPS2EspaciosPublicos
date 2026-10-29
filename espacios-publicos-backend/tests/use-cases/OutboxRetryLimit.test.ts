import { PublishPendingOutboxEventsUseCase } from "../../src/application/use-cases/PublishPendingOutboxEventsUseCase";
import { DomainEvent } from "../../src/domain/entities/DomainEvent";
import { OutboxEvent } from "../../src/domain/entities/OutboxEvent";
import { ReliableEventOutboxRepository } from "../../src/domain/repositories/ReliableEventOutboxRepository";
import { EventBus } from "../../src/domain/services/EventBus";
import { getOutboxMaxAttempts } from "../../src/shared/events/outboxConfig";
import { readLoggedLines } from "../helpers/logSpy";

// Outbox en memoria con la misma maquina de estados que la implementacion Prisma:
// markFailed deja la fila PENDING (reintento), markExhausted la deja FAILED (terminal) y
// findReady solo devuelve PENDING.
class InMemoryOutbox implements ReliableEventOutboxRepository {
  rows = new Map<string, OutboxEvent>();

  add(id: string, attempts = 0): void {
    this.rows.set(id, {
      id,
      name: "com.citypass.espacios.ReservaConfirmada",
      payload: {},
      occurredAt: new Date(),
      status: "PENDING",
      attempts,
      nextAttemptAt: null
    });
  }

  async save(): Promise<void> {}

  async findReady(limit: number): Promise<OutboxEvent[]> {
    // Ignora nextAttemptAt a proposito: estos tests miden el tope, no el backoff.
    return [...this.rows.values()].filter((row) => row.status === "PENDING").slice(0, limit);
  }

  async markPublished(id: string, publishedAt: Date): Promise<void> {
    Object.assign(this.rows.get(id)!, { status: "PUBLISHED", publishedAt, lastError: null });
  }

  async markFailed(id: string, error: string, nextAttemptAt: Date): Promise<void> {
    const row = this.rows.get(id)!;
    Object.assign(row, { status: "PENDING", attempts: row.attempts + 1, nextAttemptAt, lastError: error });
  }

  async markExhausted(id: string, error: string): Promise<void> {
    const row = this.rows.get(id)!;
    Object.assign(row, { status: "FAILED", attempts: row.attempts + 1, nextAttemptAt: null, lastError: error });
  }
}

class FlakyBus implements EventBus {
  calls = 0;

  constructor(private readonly succeedOnCall: number | null) {}

  async publish(_event: DomainEvent): Promise<void> {
    this.calls += 1;

    if (this.succeedOnCall === null || this.calls < this.succeedOnCall) {
      throw new Error(`gateway caido (intento ${this.calls})`);
    }
  }
}

describe("tope de reintentos del outbox", () => {
  let logWrite: jest.SpyInstance;

  beforeEach(() => {
    logWrite = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
    process.env.EVENT_OUTBOX_MAX_ATTEMPTS = "3";
  });

  afterEach(() => {
    logWrite.mockRestore();
    delete process.env.EVENT_OUTBOX_MAX_ATTEMPTS;
  });

  it("al llegar al tope la fila queda FAILED con el ultimo error", async () => {
    const outbox = new InMemoryOutbox();
    outbox.add("event-1");
    const bus = new FlakyBus(null);
    const useCase = new PublishPendingOutboxEventsUseCase(outbox, bus);

    await useCase.execute();
    await useCase.execute();
    expect(outbox.rows.get("event-1")).toMatchObject({ status: "PENDING", attempts: 2 });

    await useCase.execute();

    expect(outbox.rows.get("event-1")).toMatchObject({
      status: "FAILED",
      attempts: 3,
      nextAttemptAt: null,
      lastError: "gateway caido (intento 3)"
    });
  });

  it("loguea un error con el FQN y el id al agotar los intentos", async () => {
    const outbox = new InMemoryOutbox();
    outbox.add("event-1", 2);

    await new PublishPendingOutboxEventsUseCase(outbox, new FlakyBus(null)).execute();

    const errorLine = readLoggedLines(logWrite).find((line) => line.level === 50);
    expect(errorLine).toMatchObject({
      eventId: "event-1",
      eventName: "com.citypass.espacios.ReservaConfirmada",
      attempts: 3,
      maxAttempts: 3,
      lastError: "gateway caido (intento 1)"
    });
  });

  it("una fila FAILED no se vuelve a despachar", async () => {
    const outbox = new InMemoryOutbox();
    outbox.add("event-1", 2);
    const bus = new FlakyBus(null);
    const useCase = new PublishPendingOutboxEventsUseCase(outbox, bus);

    await useCase.execute();
    expect(outbox.rows.get("event-1")?.status).toBe("FAILED");
    bus.calls = 0;

    const result = await useCase.execute();

    expect(result).toEqual({ processed: 0, published: 0, failed: 0 });
    expect(bus.calls).toBe(0);
    expect(outbox.rows.get("event-1")?.attempts).toBe(3);
  });

  it("si se publica antes del tope queda PUBLISHED", async () => {
    const outbox = new InMemoryOutbox();
    outbox.add("event-1");
    const bus = new FlakyBus(3);
    const useCase = new PublishPendingOutboxEventsUseCase(outbox, bus);

    await useCase.execute();
    await useCase.execute();
    const last = await useCase.execute();

    expect(last).toEqual({ processed: 1, published: 1, failed: 0 });
    expect(outbox.rows.get("event-1")).toMatchObject({ status: "PUBLISHED", lastError: null });
    expect(bus.calls).toBe(3);
    expect(readLoggedLines(logWrite).some((line) => line.level === 50)).toBe(false);
  });

  it("el tope se lee de EVENT_OUTBOX_MAX_ATTEMPTS y vale 10 por defecto", () => {
    delete process.env.EVENT_OUTBOX_MAX_ATTEMPTS;
    expect(getOutboxMaxAttempts()).toBe(10);

    process.env.EVENT_OUTBOX_MAX_ATTEMPTS = "5";
    expect(getOutboxMaxAttempts()).toBe(5);

    for (const invalid of ["0", "-2", "abc", "2.5", ""]) {
      process.env.EVENT_OUTBOX_MAX_ATTEMPTS = invalid;
      expect(getOutboxMaxAttempts()).toBe(10);
    }
  });
});
