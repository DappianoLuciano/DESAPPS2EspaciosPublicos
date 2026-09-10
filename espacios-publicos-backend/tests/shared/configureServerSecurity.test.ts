import { createServer } from "http";
import { configureServerSecurity } from "../../src/shared/http/configureServerSecurity";

describe("limites del servidor HTTP", () => {
  it("limita solicitudes y conexiones persistentes", () => {
    const server = createServer();

    configureServerSecurity(server);

    expect(server.headersTimeout).toBe(15_000);
    expect(server.requestTimeout).toBe(30_000);
    expect(server.keepAliveTimeout).toBe(5_000);
    expect(server.maxRequestsPerSocket).toBe(100);
  });
});
