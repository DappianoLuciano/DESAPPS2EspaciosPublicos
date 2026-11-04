import request from "supertest";
import { createApp } from "../../src/app";

const mobilityEvent = {
  reclamoId: "reclamo-finalizacion-1",
  correlationId: "correlation-finalizacion-1",
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

describe("finalizacion administrativa del servicio de grua", () => {
  it("finaliza un servicio previamente solicitado", async () => {
    const app = createApp();
    const intervention = await simulate(app, mobilityEvent);

    await request(app)
      .post(`/api/admin/tow-interventions/${intervention.id}/request`)
      .set(adminHeaders())
      .send({ patente: "AB123CD" })
      .expect(200);

    const response = await request(app)
      .post(`/api/admin/tow-interventions/${intervention.id}/complete`)
      .set(adminHeaders())
      .send({})
      .expect(200);

    expect(response.body).toMatchObject({
      id: intervention.id,
      patente: "AB123CD",
      status: "COMPLETED"
    });
    expect(response.body.solicitadoAt).toEqual(expect.any(String));
    expect(response.body.resueltoAt).toEqual(expect.any(String));
  });

  it("impide finalizar antes de solicitar la grua", async () => {
    const app = createApp();
    const intervention = await simulate(app, {
      ...mobilityEvent,
      reclamoId: "reclamo-finalizacion-2"
    });

    const response = await request(app)
      .post(`/api/admin/tow-interventions/${intervention.id}/complete`)
      .set(adminHeaders())
      .send({})
      .expect(400);

    expect(response.body.message).toBe(
      "La grua debe estar solicitada antes de finalizar el servicio."
    );
  });

  it("impide finalizar dos veces el mismo servicio", async () => {
    const app = createApp();
    const intervention = await simulate(app, {
      ...mobilityEvent,
      reclamoId: "reclamo-finalizacion-3"
    });
    const requestPath = `/api/admin/tow-interventions/${intervention.id}/request`;
    const completePath = `/api/admin/tow-interventions/${intervention.id}/complete`;

    await request(app)
      .post(requestPath)
      .set(adminHeaders())
      .send({ patente: "AB123CD" })
      .expect(200);
    await request(app)
      .post(completePath)
      .set(adminHeaders())
      .send({})
      .expect(200);

    await request(app)
      .post(completePath)
      .set(adminHeaders())
      .send({})
      .expect(400);
  });

  it("impide que un ciudadano finalice el servicio", async () => {
    const app = createApp();
    const intervention = await simulate(app, {
      ...mobilityEvent,
      reclamoId: "reclamo-finalizacion-4"
    });

    await request(app)
      .post(`/api/admin/tow-interventions/${intervention.id}/complete`)
      .set(citizenHeaders())
      .send({})
      .expect(403);
  });
});

async function simulate(
  app: ReturnType<typeof createApp>,
  event: typeof mobilityEvent
) {
  const response = await request(app)
    .post("/api/admin/tow-interventions/simulate")
    .set(adminHeaders())
    .send(event)
    .expect(201);

  return response.body as { id: string };
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
