import { Server } from "http";

export function configureServerSecurity(server: Server): void {
  server.headersTimeout = 15_000;
  server.requestTimeout = 30_000;
  server.keepAliveTimeout = 5_000;
  server.maxRequestsPerSocket = 100;
}
