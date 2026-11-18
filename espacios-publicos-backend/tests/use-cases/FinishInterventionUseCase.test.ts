import express, { NextFunction, Request, Response } from "express";
import request from "supertest";
import { FinishInterventionUseCase, ListPendingInterventionsUseCase } from "../../src/application/use-cases/FinishInterventionUseCase";
import { CityIncidentRecord } from "../../src/domain/entities/CityIncidentRecord";
import { DomainEvent } from "../../src/domain/entities/DomainEvent";
import { InterventionController } from "../../src/interfaces/http/controllers/InterventionController";
import { errorHandler } from "../../src/interfaces/http/middlewares/errorHandler";
import { requestContext } from "../../src/interfaces/http/middlewares/requestContext";
import { createInterventionRoutes } from "../../src/interfaces/http/routes/interventionRoutes";
import { definitions } from "../../scripts/register-event-types";
import { NotFoundError } from "../../src/shared/errors/NotFoundError";
import { ValidationError } from "../../src/shared/errors/ValidationError";

const reportedAt = new Date("2026-11-06T10:00:00.000Z");
const incident: CityIncidentRecord = {
  id: "inc-1", source: "RECLAMOS", externalId: "rec-1", category: "OBSTRUCCION_VIAL",
  latitude: -34.6, longitude: -58.43, zone: "Caballito", active: true, reportedAt, updatedAt: reportedAt
};

function build(active: CityIncidentRecord | null = incident) {
  const saved: DomainEvent[] = [];
  const published: DomainEvent[] = [];
  const repository = {
    findActive: jest.fn().mockResolvedValue(active),
    deactivate: jest.fn().mockResolvedValue(undefined),
    findActiveBySource: jest.fn().mockResolvedValue(active ? [active] : [])
  };
  const useCase = new FinishInterventionUseCase(
    repository,
    { save: async (event: DomainEvent) => void saved.push(event) } as never,
    { publish: async (event: DomainEvent) => void published.push(event) }
  );
  return { useCase, repository, saved, published };
}

describe("FinishInterventionUseCase (IntervencionFinalizada)", () => {
  it("publica el contrato registrado y da de baja el incidente", async () => {
    const { useCase, repository, saved, published } = build();

    await useCase.execute({ reclamoId: "rec-1", resultado: "RESUELTO", idAuto: "ab123cd" });

    expect(repository.findActive).toHaveBeenCalledWith("RECLAMOS", "rec-1");
    expect(repository.deactivate).toHaveBeenCalledWith("RECLAMOS", "rec-1");
    expect(saved).toHaveLength(1);
    expect(published.map((event) => event.id)).toEqual(saved.map((event) => event.id));
    expect(saved[0].name).toBe("com.citypass.espacios.IntervencionFinalizada");
    expect(saved[0].payload).toEqual({
      reclamoId: "rec-1",
      resultado: "RESUELTO",
      idAuto: "AB123CD",
      solicitadoAt: reportedAt.getTime(),
      resueltoAt: saved[0].occurredAt.getTime()
    });
  });

  it("RECHAZADO sin patente manda idAuto en null", async () => {
    const { useCase, saved } = build();

    await useCase.execute({ reclamoId: "rec-1", resultado: "RECHAZADO" });

    expect(saved[0].payload).toEqual(expect.objectContaining({ resultado: "RECHAZADO", idAuto: null }));
  });

  it.each(["CERRADO", "", undefined, 1])("rechaza el resultado %p", async (resultado) => {
    const { useCase, saved, repository } = build();

    await expect(useCase.execute({ reclamoId: "rec-1", resultado })).rejects.toBeInstanceOf(ValidationError);
    expect(saved).toHaveLength(0);
    expect(repository.deactivate).not.toHaveBeenCalled();
  });

  it("sin intervencion pendiente devuelve 404 y no publica", async () => {
    const { useCase, saved } = build(null);

    await expect(useCase.execute({ reclamoId: "rec-1", resultado: "RESUELTO" })).rejects.toBeInstanceOf(NotFoundError);
    expect(saved).toHaveLength(0);
  });

  it("el contrato local coincide con el registrado (schemaId 59)", () => {
    const contract = definitions.find((item) => item.name === "IntervencionFinalizada")!;
    expect(contract.fields.map(({ name, type, default: fallback }) => ({ name, type, default: fallback }))).toEqual([
      { name: "reclamoId", type: "string", default: undefined },
      { name: "resultado", type: "string", default: undefined },
      { name: "idAuto", type: ["null", "string"], default: null },
      { name: "solicitadoAt", type: ["null", "long"], default: null },
      { name: "resueltoAt", type: ["null", "long"], default: null }
    ]);
  });
});

describe("/api/admin/interventions", () => {
  function app(role: "municipal_admin" | "citizen") {
    const { useCase, repository, saved } = build();
    const server = express();
    server.use(express.json());
    server.use(requestContext);
    server.use((req: Request, _res: Response, next: NextFunction) => {
      req.user = { id: "u1", name: "U", email: "u@test.com", role };
      next();
    });
    server.use("/api/admin/interventions", createInterventionRoutes(
      new InterventionController(new ListPendingInterventionsUseCase(repository), useCase)
    ));
    server.use(errorHandler);
    return { server, saved };
  }

  it("el admin lista las pendientes y cierra una", async () => {
    const { server, saved } = app("municipal_admin");

    const list = await request(server).get("/api/admin/interventions").expect(200);
    expect(list.body).toEqual([expect.objectContaining({ reclamoId: "rec-1", zone: "Caballito" })]);

    const done = await request(server).post("/api/admin/interventions/rec-1/finish").send({ resultado: "RESUELTO" }).expect(200);
    expect(done.body).toEqual(expect.objectContaining({ reclamoId: "rec-1", resultado: "RESUELTO" }));
    expect(saved).toHaveLength(1);
  });

  it("un ciudadano no puede", async () => {
    const { server } = app("citizen");

    await request(server).get("/api/admin/interventions").expect(403);
    await request(server).post("/api/admin/interventions/rec-1/finish").send({ resultado: "RESUELTO" }).expect(403);
  });

  it("rechaza campos extra en el body", async () => {
    const { server } = app("municipal_admin");

    await request(server).post("/api/admin/interventions/rec-1/finish").send({ resultado: "RESUELTO", estado: "x" }).expect(400);
  });
});
