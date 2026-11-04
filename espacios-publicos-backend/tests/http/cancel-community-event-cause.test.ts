import express, { NextFunction, Request, Response } from "express";
import request from "supertest";
import { CancelCommunityEventUseCase } from "../../src/application/use-cases/CancelCommunityEventUseCase";
import { DomainEvent } from "../../src/domain/entities/DomainEvent";
import { CommunityEventController } from "../../src/interfaces/http/controllers/CommunityEventController";
import { errorHandler } from "../../src/interfaces/http/middlewares/errorHandler";
import { requestContext } from "../../src/interfaces/http/middlewares/requestContext";
import { createCommunityEventRoutes } from "../../src/interfaces/http/routes/communityEventRoutes";

// Recorre la ruta real: el allowBodyFields de la ruta rechaza los campos que no conoce,
// asi que un test del use case solo no alcanzaria para cubrir la causa.
function buildApp() {
  const saved: DomainEvent[] = [];
  const communityEvent = {
    id: "event-1",
    publicSpaceId: "space-1",
    status: "ACTIVE",
    endDate: new Date(Date.now() + 3600_000)
  };
  const updateStatus = jest.fn(async () => ({ ...communityEvent, status: "CANCELLED" }));
  const useCase = new CancelCommunityEventUseCase(
    { findById: jest.fn().mockResolvedValue(communityEvent), updateStatus } as never,
    { save: async (event: DomainEvent) => void saved.push(event) },
    { publish: jest.fn() }
  );
  const unused = {} as never;
  const controller = new CommunityEventController(
    unused, unused, unused, unused, unused, unused, unused, unused, useCase
  );

  const app = express();
  app.use(express.json());
  app.use(requestContext);
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.user = { id: "sub-admin", name: "Admin", email: "admin@test.com", role: "municipal_admin" };
    next();
  });
  app.use("/api/community-events", createCommunityEventRoutes(controller));
  app.use(errorHandler);

  return { app, saved, updateStatus };
}

const activityModified = (saved: DomainEvent[]) =>
  saved.find((event) => event.name === "com.citypass.espacios.ActividadModificada");

describe("PATCH /api/community-events/:id/cancel con causa", () => {
  let stdout: jest.SpyInstance;

  beforeEach(() => {
    stdout = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stdout.mockRestore();
  });

  it("sin causa manda causaTipo y causaId en null y el actor del token", async () => {
    const { app, saved } = buildApp();

    await request(app).patch("/api/community-events/event-1/cancel").send({}).expect(200);

    expect(activityModified(saved)?.payload).toMatchObject({
      causaTipo: null,
      causaId: null,
      actorSub: "sub-admin"
    });
  });

  it("con causa los dos campos viajan en ActividadModificada", async () => {
    const { app, saved } = buildApp();

    await request(app)
      .patch("/api/community-events/event-1/cancel")
      .send({ reason: "Tormenta", causaTipo: "EVENTO_CLIMATICO", causaId: "alert-7" })
      .expect(200);

    expect(activityModified(saved)?.payload).toMatchObject({
      motivo: "Tormenta",
      causaTipo: "EVENTO_CLIMATICO",
      causaId: "alert-7"
    });
  });

  it.each([
    ["solo causaTipo", { causaTipo: "RECLAMO" }],
    ["solo causaId", { causaId: "reclamo-1" }],
    ["causaTipo invalido", { causaTipo: "OTRO", causaId: "x" }],
    ["actorSub en el body", { actorSub: "otro-actor" }]
  ])("responde 400 con %s y no cancela", async (_case, body) => {
    const { app, saved, updateStatus } = buildApp();

    await request(app).patch("/api/community-events/event-1/cancel").send(body).expect(400);

    expect(updateStatus).not.toHaveBeenCalled();
    expect(saved).toHaveLength(0);
  });
});
