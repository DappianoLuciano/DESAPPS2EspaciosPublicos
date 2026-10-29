import { OutboxTrackingEventBus } from "../../src/infrastructure/events/OutboxTrackingEventBus";

const event = {
  id: "outbox-1",
  name: "com.citypass.espacios.ReservaConfirmada",
  payload: {},
  occurredAt: new Date()
};

function build(publish: jest.Mock) {
  const outbox = {
    markPublished: jest.fn().mockResolvedValue(undefined),
    markFailed: jest.fn().mockResolvedValue(undefined)
  };

  return { bus: new OutboxTrackingEventBus({ publish }, outbox), outbox };
}

describe("OutboxTrackingEventBus", () => {
  it("marca el registro como publicado cuando el bus real acepta el evento", async () => {
    const publish = jest.fn().mockResolvedValue(undefined);
    const { bus, outbox } = build(publish);

    await bus.publish(event);

    expect(publish).toHaveBeenCalledWith(event);
    expect(outbox.markPublished).toHaveBeenCalledWith("outbox-1", expect.any(Date));
    expect(outbox.markFailed).not.toHaveBeenCalled();
  });

  it("si el gateway falla programa el reintento y no propaga el error", async () => {
    const { bus, outbox } = build(jest.fn().mockRejectedValue(new Error("gateway caido")));
    const before = Date.now();

    await expect(bus.publish(event)).resolves.toBeUndefined();

    expect(outbox.markPublished).not.toHaveBeenCalled();
    const [id, message, nextAttemptAt] = outbox.markFailed.mock.calls[0];
    expect(id).toBe("outbox-1");
    expect(message).toBe("gateway caido");
    expect((nextAttemptAt as Date).getTime()).toBeGreaterThan(before);
  });

  it("no rompe si no puede actualizar el estado del outbox", async () => {
    const { bus, outbox } = build(jest.fn().mockResolvedValue(undefined));
    outbox.markPublished.mockRejectedValue(new Error("db caida"));

    await expect(bus.publish(event)).resolves.toBeUndefined();
  });
});
