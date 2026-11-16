import request from "supertest";
import { createApp } from "../../src/app";

const mobilityEvent = {
  reclamoId: "reclamo-grua-1",
  correlationId: "correlation-grua-1",
  latitud: -34.6037,
  longitud: -58.3816,
  direccion: "Av. Corrientes 1000",
  barrio: "San Nicolas",
  afectaCiclovia: true,
  estacionesAfectadasIds: [10, 11],
  impactoCirculacion: "ALTO",
  desvioSugerido: "Av. Cordoba",
  requiereIntervencionInmediata: true,
  requiereGrua: true,
  evaluadoAt: Date.parse("2026-11-04T12:00:00.000Z")
};

describe("solicitud administrativa de grua", () => {
  it("registra la patente, el horario y el nuevo estado", async () => {
    const app = createApp();
    const simulation = await simulate(app, mobilityEvent);

    const response = await request(app)
      .post(`/api/admin/tow-interventions/${simulation.body.id}/request`)
      .set(adminHeaders())
      .send({ patente: "ab-123-cd" })
      .expect(200);

    expect(response.body).toMatchObject({
      id: simulation.body.id,
      patente: "AB123CD",
      status: "TOW_REQUESTED",
      resueltoAt: null
    });
    expect(response.body.solicitadoAt).toEqual(expect.any(String));
  });

  it("rechaza una patente invalida", async () => {
    const app = createApp();
    const simulation = await simulate(app, {
      ...mobilityEvent,
      reclamoId: "reclamo-grua-2"
    });

    const response = await request(app)
      .post(`/api/admin/tow-interventions/${simulation.body.id}/request`)
      .set(adminHeaders())
      .send({ patente: "***" })
      .expect(400);

    expect(response.body.message).toBe("La patente indicada no es valida.");
  });

  it("impide solicitar dos veces la grua", async () => {
    const app = createApp();
    const simulation = await simulate(app, {
      ...mobilityEvent,
      reclamoId: "reclamo-grua-3"
    });
    const path = `/api/admin/tow-interventions/${simulation.body.id}/request`;

    await request(app)
      .post(path)
      .set(adminHeaders())
      .send({ patente: "AB123CD" })
      .expect(200);

    const response = await request(app)
      .post(path)
      .set(adminHeaders())
      .send({ patente: "AB123CD" })
      .expect(400);

    expect(response.body.message).toBe(
      "La grua ya fue solicitada para esta intervencion."
    );
  });

  it("impide solicitar grua para un caso que no la requiere", async () => {
    const app = createApp();
    const simulation = await simulate(app, {
      ...mobilityEvent,
      reclamoId: "reclamo-grua-4",
      requiereGrua: false
    });

    const response = await request(app)
      .post(`/api/admin/tow-interventions/${simulation.body.id}/request`)
      .set(adminHeaders())
      .send({ patente: "AB123CD" })
      .expect(400);

    expect(response.body.message).toBe("La intervencion no requiere una grua.");
  });

  it("rechaza la operacion realizada por un ciudadano", async () => {
    const app = createApp();
    const simulation = await simulate(app, {
      ...mobilityEvent,
      reclamoId: "reclamo-grua-5"
    });

    await request(app)
      .post(`/api/admin/tow-interventions/${simulation.body.id}/request`)
      .set(citizenHeaders())
      .send({ patente: "AB123CD" })
      .expect(403);
  });
});

function simulate(app: ReturnType<typeof createApp>, event: typeof mobilityEvent) {
  return request(app)
    .post("/api/admin/tow-interventions/simulate")
    .set(adminHeaders())
    .send(event)
    .expect(201);
}

function adminHeaders(): Record<string, string> {
  return {
    "x-user-id": "admin-1",
    "x-user-name": "Gestion Municipal",
    "x-user-email": "admin@citypass.test",
    "x-user-role": "municipal_admin"
  };
}

function citizenHeaders(): Record<string, string> {
  return {
    "x-user-id": "citizen-1",
    "x-user-name": "Ciudadano de prueba",
    "x-user-email": "ciudadano@citypass.test",
    "x-user-role": "citizen"
  };
}
