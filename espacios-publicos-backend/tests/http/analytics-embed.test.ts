import express, { NextFunction, Request, Response } from "express";
import request from "supertest";
import { GetAnalyticsDashboardUseCase } from "../../src/application/use-cases/GetAnalyticsDashboardUseCase";
import { AnalyticsEmbedClient } from "../../src/infrastructure/analytics/AnalyticsEmbedClient";
import { errorHandler } from "../../src/interfaces/http/middlewares/errorHandler";
import { requestContext } from "../../src/interfaces/http/middlewares/requestContext";
import { createAnalyticsRoutes } from "../../src/interfaces/http/routes/analyticsRoutes";

const ANALITICA = "https://analitica.test";
const HTML = "<!doctype html><html><body>Tablero</body></html>";

function respond(body: string, status = 200, contentType = "application/json") {
  return jest.fn(async () => new Response(body, { status, headers: { "Content-Type": contentType } }));
}

function client(fetchFn: jest.Mock) {
  return new AnalyticsEmbedClient(ANALITICA, { getToken: async () => "token-servicio" }, fetchFn as never);
}

describe("AnalyticsEmbedClient", () => {
  it("pide el tablero de espacios con el token de servicio y el del usuario", async () => {
    const fetchFn = respond(JSON.stringify({ modulo: "espacios", generado_en: "2026-11-10T18:00:00Z", html: HTML }));

    const dashboard = await client(fetchFn).fetchDashboard("token-admin");

    expect(dashboard).toEqual({ html: HTML, generatedAt: "2026-11-10T18:00:00Z" });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${ANALITICA}/embed/espacios`);
    expect(init.headers).toEqual(expect.objectContaining({
      Authorization: "Bearer token-servicio",
      "X-User-Token": "token-admin",
      "X-Usuario-Token": "token-admin"
    }));
  });

  it("acepta tambien el HTML directo", async () => {
    const dashboard = await client(respond(HTML, 200, "text/html; charset=utf-8")).fetchDashboard("t");

    expect(dashboard).toEqual({ html: HTML, generatedAt: null });
  });

  it("un 403 de Analitica llega como 403", async () => {
    await expect(client(respond("no", 403, "text/plain")).fetchDashboard("t")).rejects.toMatchObject({ statusCode: 403 });
  });

  it("si Analitica falla o no responde, 502", async () => {
    await expect(client(respond("x", 503, "text/plain")).fetchDashboard("t")).rejects.toMatchObject({ statusCode: 502 });
    const down = jest.fn(async () => { throw new Error("timeout"); });
    await expect(client(down).fetchDashboard("t")).rejects.toMatchObject({ statusCode: 502 });
  });

  it("un JSON sin html es un 502", async () => {
    await expect(client(respond(JSON.stringify({ modulo: "espacios" }))).fetchDashboard("t")).rejects.toMatchObject({ statusCode: 502 });
  });
});

describe("GET /api/admin/analytics", () => {
  function app(role: "municipal_admin" | "citizen", useCase: GetAnalyticsDashboardUseCase) {
    const server = express();
    server.use(requestContext);
    server.use((req: Request, _res: Response, next: NextFunction) => {
      req.user = { id: "u1", name: "U", email: "u@test.com", role };
      next();
    });
    server.use("/api/admin/analytics", createAnalyticsRoutes(useCase));
    server.use(errorHandler);
    return server;
  }

  const source = { fetchDashboard: jest.fn(async () => ({ html: HTML, generatedAt: null })) };

  it("el admin lo ve, con el token de su sesion y sin cache", async () => {
    const response = await request(app("municipal_admin", new GetAnalyticsDashboardUseCase(source)))
      .get("/api/admin/analytics")
      .set("Authorization", "Bearer token-admin")
      .expect(200);

    expect(response.body).toEqual({ html: HTML, generatedAt: null });
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(source.fetchDashboard).toHaveBeenCalledWith("token-admin");
  });

  it("un ciudadano no", async () => {
    await request(app("citizen", new GetAnalyticsDashboardUseCase(source))).get("/api/admin/analytics").expect(403);
  });

  it("sin ANALITICA_URL configurada responde 503", async () => {
    await request(app("municipal_admin", new GetAnalyticsDashboardUseCase()))
      .get("/api/admin/analytics")
      .set("Authorization", "Bearer token-admin")
      .expect(503);
  });

  it("sin token de sesion (identidad de prueba) responde 401", async () => {
    await request(app("municipal_admin", new GetAnalyticsDashboardUseCase(source))).get("/api/admin/analytics").expect(401);
  });
});
