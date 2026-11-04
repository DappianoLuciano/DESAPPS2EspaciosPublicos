import { PublishPendingOutboxEventsUseCase } from "../../src/application/use-cases/PublishPendingOutboxEventsUseCase";
import { OutboxEvent } from "../../src/domain/entities/OutboxEvent";
import { PrismaEventOutboxRepository } from "../../src/infrastructure/database/PrismaEventOutboxRepository";
import { dispatchableEventNames } from "../../src/shared/events/eventTypes";

const mockFindMany = jest.fn();
const mockFindFirst = jest.fn();

jest.mock("../../src/infrastructure/database/prismaClient", () => ({
  prisma: { eventOutbox: {
    findMany: (...args: unknown[]) => mockFindMany(...args),
    findFirst: (...args: unknown[]) => mockFindFirst(...args)
  } }
}));

const ESPACIOS_FQNS = [
  "com.citypass.espacios.EventoComunitarioPublicado",
  "com.citypass.espacios.ActividadCreada",
  "com.citypass.espacios.ActividadModificada",
  "com.citypass.espacios.EventoCancelado",
  "com.citypass.espacios.EspacioEstadoCambiado",
  "com.citypass.espacios.ReservaConfirmada",
  "com.citypass.espacios.ReservaAfectada",
  "com.citypass.espacios.EspacioLiberado",
  "com.citypass.espacios.ProblematicaRegistrada"
];
const WEATHER_FQNS = [
  "com.citypass.espacios.CriticidadClimaticaConfirmada",
  "com.citypass.espacios.CriticidadClimaticaFinalizada"
];
const OVERRIDE_VARS = [
  "COMMUNITY_EVENT_PUBLISHED_EVENT_FQN",
  "ACTIVITY_CREATED_EVENT_FQN",
  "ACTIVITY_MODIFIED_EVENT_FQN",
  "COMMUNITY_EVENT_CANCELLED_EVENT_FQN",
  "PUBLIC_SPACE_STATUS_CHANGED_EVENT_FQN",
  "RESERVATION_CONFIRMED_EVENT_FQN"
];

describe("outbox: eventos que se despachan al gateway", () => {
  afterEach(() => {
    OVERRIDE_VARS.forEach((name) => delete process.env[name]);
  });

  it("incluye los contratos de espacios y cultura mas los 2 del clima", () => {
    expect(dispatchableEventNames().sort()).toEqual([...ESPACIOS_FQNS, ...WEATHER_FQNS].sort());
  });

  it("findReady consulta por todos esos nombres y excluye las filas historicas", async () => {
    mockFindMany.mockResolvedValue([]);

    await new PrismaEventOutboxRepository().findReady(25, new Date());

    const { where } = mockFindMany.mock.calls[0][0];
    expect(where.name.in.sort()).toEqual([...ESPACIOS_FQNS, ...WEATHER_FQNS].sort());
    expect(where.name.in).not.toContain("cultura.ciudadano_inscripto");
    // Las FAILED son terminales (tope de reintentos): no se vuelven a despachar.
    expect(where.status).toBe("PENDING");
  });

  it("los nombres se pueden sobrescribir por entorno", () => {
    process.env.RESERVATION_CONFIRMED_EVENT_FQN = "com.otro.ns.ReservaConfirmada";

    expect(dispatchableEventNames()).toContain("com.otro.ns.ReservaConfirmada");
    expect(dispatchableEventNames()).not.toContain("com.citypass.espacios.ReservaConfirmada");
  });

  it("el worker publica los eventos nuevos y los marca como publicados", async () => {
    const events: OutboxEvent[] = ESPACIOS_FQNS.map((name, index) => ({
      id: `event-${index}`,
      name,
      payload: {},
      occurredAt: new Date(),
      status: "PENDING",
      attempts: 0
    }));
    const published: string[] = [];
    const markPublished = jest.fn(async (id: string) => void published.push(id));
    const sent: string[] = [];

    const result = await new PublishPendingOutboxEventsUseCase(
      {
        save: jest.fn(),
        findReady: async () => events,
        markPublished,
        markFailed: jest.fn(),
        markExhausted: jest.fn()
      },
      { publish: async (event) => void sent.push(event.name) }
    ).execute();

    expect(result).toEqual({ processed: events.length, published: events.length, failed: 0 });
    expect(sent).toEqual(ESPACIOS_FQNS);
    expect(published).toEqual(events.map((event) => event.id));
  });

  it("un cierre pendiente no bloquea los mensajes de los demas casos de uso", async () => {
    const previousDriver = process.env.EVENT_BUS_DRIVER;
    process.env.EVENT_BUS_DRIVER = "citypass";
    const messages: OutboxEvent[] = [...ESPACIOS_FQNS, ...WEATHER_FQNS].map((name, i) => ({
      id: `mixed-${i}`, name, payload: { alertaId: "alert-1" },
      occurredAt: new Date(), status: "PENDING", attempts: 0
    }));
    mockFindMany.mockResolvedValue(messages);
    mockFindFirst.mockResolvedValue(null);
    try {
      const repository = new PrismaEventOutboxRepository();
      const waiting = await repository.findReady(25, new Date());
      expect(waiting.map(event => event.name)).toEqual([...ESPACIOS_FQNS, WEATHER_FQNS[0]]);
      expect(mockFindFirst).toHaveBeenCalledWith({ where: {
        name: WEATHER_FQNS[0], status: "PUBLISHED",
        payload: { path: ["alertaId"], equals: "alert-1" }
      } });

      mockFindFirst.mockResolvedValue({ id: "confirmation" });
      const ready = await repository.findReady(25, new Date());
      expect(ready.map(event => event.name)).toEqual([...ESPACIOS_FQNS, ...WEATHER_FQNS]);
      const sent: string[] = [];
      const result = await new PublishPendingOutboxEventsUseCase({
        save: jest.fn(), findReady: async () => ready, markPublished: jest.fn(),
        markFailed: jest.fn(), markExhausted: jest.fn()
      }, { publish: async event => void sent.push(event.name) }).execute();
      const total = ESPACIOS_FQNS.length + WEATHER_FQNS.length;
      expect(result).toEqual({ processed: total, published: total, failed: 0 });
      expect(sent).toEqual([...ESPACIOS_FQNS, ...WEATHER_FQNS]);
    } finally {
      if (previousDriver === undefined) delete process.env.EVENT_BUS_DRIVER;
      else process.env.EVENT_BUS_DRIVER = previousDriver;
    }
  });
});
