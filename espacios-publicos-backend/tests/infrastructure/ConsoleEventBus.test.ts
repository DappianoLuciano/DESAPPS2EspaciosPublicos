import { ConsoleEventBus } from "../../src/infrastructure/events/ConsoleEventBus";

describe("logs del bus de eventos", () => {
  it("registra metadatos sin exponer el contenido del evento", async () => {
    const log = jest.spyOn(console, "log").mockImplementation();
    const eventBus = new ConsoleEventBus();

    await eventBus.publish({
      id: "event-1",
      name: "evento.prueba",
      occurredAt: new Date("2030-01-01T00:00:00.000Z"),
      payload: { citizenEmail: "persona@example.com" }
    });

    expect(log).toHaveBeenCalledWith("[EventBus]", {
      id: "event-1",
      name: "evento.prueba",
      occurredAt: "2030-01-01T00:00:00.000Z"
    });
    expect(log).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      citizenEmail: expect.anything()
    }));

    log.mockRestore();
  });
});
