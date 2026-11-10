import express, { NextFunction, Request, Response } from "express";
import request from "supertest";
import { GetIntegrationOverviewUseCase } from "../../src/application/use-cases/GetIntegrationOverviewUseCase";
import { CommunityEvent } from "../../src/domain/entities/CommunityEvent";
import { IntegrationStatusRepository } from "../../src/domain/repositories/IntegrationStatusRepository";
import { errorHandler } from "../../src/interfaces/http/middlewares/errorHandler";
import { requestContext } from "../../src/interfaces/http/middlewares/requestContext";
import { createIntegrationRoutes } from "../../src/interfaces/http/routes/integrationRoutes";

const now = new Date("2026-11-10T12:00:00.000Z");
const hours = (h: number) => new Date(now.getTime() + h * 3600_000);

function event(id: string, overrides: Partial<CommunityEvent> = {}): CommunityEvent {
  return {
    id, title: `Evento ${id}`, category: "Música", tags: [], description: "d", requirements: [],
    publicSpaceId: "space-1", organizerName: "Municipio", capacity: 10, requiresRegistration: true,
    startDate: hours(24), endDate: hours(26), createdAt: now, status: "ACTIVE", ...overrides
  };
}

function build() {
  const status: IntegrationStatusRepository = {
    inboundByType: jest.fn().mockResolvedValue([{ eventType: "com.citypass.reclamos.ReclamoActualizado", count: 14, lastReceivedAt: now }]),
    recentInbound: jest.fn().mockResolvedValue([{ eventId: "e1", eventType: "com.citypass.reclamos.ReclamoActualizado", receivedAt: now }]),
    outboxByName: jest.fn().mockResolvedValue([{ name: "com.citypass.espacios.EventoCancelado", published: 3, pending: 0, failed: 1, lastCreatedAt: now }]),
    outboxProblems: jest.fn().mockResolvedValue([])
  };
  const findActiveBySource = jest.fn(async (source: string) => source === "RECLAMOS"
    ? [{ id: "i1", source: "RECLAMOS" as const, externalId: "rec-1", category: "BACHE", latitude: -34.6, longitude: -58.4, zone: "Caballito", active: true, reportedAt: hours(-2), updatedAt: now }]
    : [{ id: "i2", source: "EMERGENCIAS" as const, externalId: "em-1", category: null, latitude: null, longitude: null, zone: "La Boca", active: true, reportedAt: hours(-1), updatedAt: now }]);
  const useCase = new GetIntegrationOverviewUseCase(
    {
      findAll: jest.fn().mockResolvedValue([
        event("later", { startDate: hours(48), endDate: hours(50) }),
        event("soon"),
        event("cancelled", { status: "CANCELLED" }),
        event("finished", { startDate: hours(-5), endDate: hours(-3) })
      ])
    },
    { findAll: jest.fn().mockResolvedValue([{ id: "space-1", name: "Usina del Arte", zone: "La Boca" }]) },
    {
      findByEventId: jest.fn(async (id: string) => id === "soon"
        ? { eventoId: "soon", estado: "RECOMMENDED" as const, estacionId: "12", estacion: "Parque Lezama", latitud: -34.6, longitud: -58.37,
            lugaresLibres: 8, distanciaMetros: 350, mensaje: "ok", descartadasPorIncidentes: 1, calculadaEn: now, correlationId: null, receivedAt: now }
        : null)
    },
    { findActiveBySource },
    status
  );
  return { useCase, status, findActiveBySource };
}

describe("GetIntegrationOverviewUseCase", () => {
  it("lista solo eventos que no terminaron ni se cancelaron, con la recomendacion de Movilidad si existe", async () => {
    const { useCase } = build();

    const overview = await useCase.execute(now);

    expect(overview.events.map((e) => e.id)).toEqual(["soon", "later"]);
    expect(overview.events[0]).toEqual(expect.objectContaining({
      space: { id: "space-1", name: "Usina del Arte", zone: "La Boca" },
      recommendation: expect.objectContaining({ estacion: "Parque Lezama", lugaresLibres: 8, descartadasPorIncidentes: 1 })
    }));
    expect(overview.events[1].recommendation).toBeNull();
  });

  it("junta los incidentes activos de Reclamos y Emergencias, el mas reciente primero", async () => {
    const { useCase, findActiveBySource } = build();

    const overview = await useCase.execute(now);

    expect(findActiveBySource).toHaveBeenCalledWith("RECLAMOS");
    expect(findActiveBySource).toHaveBeenCalledWith("EMERGENCIAS");
    expect(overview.incidents.map((i) => i.externalId)).toEqual(["em-1", "rec-1"]);
  });

  it("resume la mensajeria solo con los eventos que despachamos", async () => {
    const { useCase, status } = build();

    const overview = await useCase.execute(now);

    const names = (status.outboxByName as jest.Mock).mock.calls[0][0] as string[];
    expect(names).toContain("com.citypass.espacios.EspacioPublicoAfectado");
    expect(names.some((name) => name.startsWith("cultura."))).toBe(false);
    expect(overview.inbound.byType[0].count).toBe(14);
    expect(overview.outbox.byName[0].failed).toBe(1);
  });
});

describe("GET /api/admin/integrations", () => {
  function app(role: "municipal_admin" | "citizen") {
    const server = express();
    server.use(requestContext);
    server.use((req: Request, _res: Response, next: NextFunction) => {
      req.user = { id: "u1", name: "U", email: "u@test.com", role };
      next();
    });
    server.use("/api/admin/integrations", createIntegrationRoutes(build().useCase));
    server.use(errorHandler);
    return server;
  }

  it("el admin lo ve", async () => {
    const response = await request(app("municipal_admin")).get("/api/admin/integrations").expect(200);
    expect(Object.keys(response.body)).toEqual(["generatedAt", "events", "incidents", "inbound", "outbox"]);
  });

  it("un ciudadano no", async () => {
    await request(app("citizen")).get("/api/admin/integrations").expect(403);
  });
});
