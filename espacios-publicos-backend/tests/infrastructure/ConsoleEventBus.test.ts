import { ConsoleEventBus } from "../../src/infrastructure/events/ConsoleEventBus";
import { readLoggedLines } from "../helpers/logSpy";

describe("logs del bus de eventos", () => {
  it("registra metadatos sin exponer el contenido del evento", async () => {
    const write = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
    const eventBus = new ConsoleEventBus();

    await eventBus.publish({
      id: "event-1",
      name: "evento.prueba",
      occurredAt: new Date("2030-01-01T00:00:00.000Z"),
      payload: { citizenEmail: "persona@example.com" }
    });

    const lines = readLoggedLines(write);
    expect(lines).toContainEqual(
      expect.objectContaining({
        msg: "[EventBus]",
        id: "event-1",
        name: "evento.prueba",
        occurredAt: "2030-01-01T00:00:00.000Z"
      })
    );
    expect(JSON.stringify(lines)).not.toContain("persona@example.com");

    write.mockRestore();
  });
});
