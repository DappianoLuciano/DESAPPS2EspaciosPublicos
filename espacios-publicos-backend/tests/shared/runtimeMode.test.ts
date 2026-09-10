import { getListenHost } from "../../src/shared/runtime/runtimeMode";

describe("configuracion de escucha del servidor", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalLifecycleEvent = process.env.npm_lifecycle_event;

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }

    if (originalLifecycleEvent === undefined) {
      delete process.env.npm_lifecycle_event;
    } else {
      process.env.npm_lifecycle_event = originalLifecycleEvent;
    }
  });

  it("limita el modo desarrollo a la interfaz local", () => {
    process.env.NODE_ENV = "development";

    expect(getListenHost()).toBe("127.0.0.1");
  });

  it("no altera la interfaz de escucha administrada en produccion", () => {
    process.env.NODE_ENV = "production";

    expect(getListenHost()).toBeUndefined();
  });
});
