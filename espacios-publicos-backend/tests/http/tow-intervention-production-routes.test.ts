import express, { NextFunction, Request, Response } from "express";
import request from "supertest";
import { TowInterventionController } from "../../src/interfaces/http/controllers/TowInterventionController";
import { createTowInterventionRoutes } from "../../src/interfaces/http/routes/towInterventionRoutes";

describe("rutas de intervenciones de grua en produccion", () => {
  const previousNodeEnv = process.env.NODE_ENV;

  beforeAll(() => {
    process.env.NODE_ENV = "production";
  });

  afterAll(() => {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });

  it("mantiene las acciones administrativas y no registra la simulacion", async () => {
    const controller = {
      list: jest.fn(async (_request: Request, response: Response) => {
        response.json([]);
      }),
      requestTow: jest.fn(async (_request: Request, response: Response) => {
        response.json({ status: "TOW_REQUESTED" });
      }),
      completeTowService: jest.fn(async (_request: Request, response: Response) => {
        response.json({ status: "COMPLETED" });
      }),
      simulateMobilityEvent: jest.fn(async (_request: Request, response: Response) => {
        response.status(201).json({});
      })
    } as unknown as TowInterventionController;

    const app = express();
    app.use(express.json());
    app.use((request: Request, _response: Response, next: NextFunction) => {
      request.user = {
        id: "admin-1",
        name: "Gestion Municipal",
        email: "admin@citypass.test",
        role: "municipal_admin"
      };
      next();
    });
    app.use(
      "/api/admin/tow-interventions",
      createTowInterventionRoutes(controller)
    );
    app.use((_request, response) => {
      response.status(404).json({ message: "Ruta no encontrada." });
    });

    await request(app).get("/api/admin/tow-interventions").expect(200);
    await request(app)
      .post("/api/admin/tow-interventions/intervention-1/request")
      .send({ patente: "AB123CD" })
      .expect(200);
    await request(app)
      .post("/api/admin/tow-interventions/intervention-1/complete")
      .send({})
      .expect(200);
    await request(app)
      .post("/api/admin/tow-interventions/simulate")
      .send({})
      .expect(404);

    expect(controller.list).toHaveBeenCalledTimes(1);
    expect(controller.requestTow).toHaveBeenCalledTimes(1);
    expect(controller.completeTowService).toHaveBeenCalledTimes(1);
    expect(controller.simulateMobilityEvent).not.toHaveBeenCalled();
  });
});
