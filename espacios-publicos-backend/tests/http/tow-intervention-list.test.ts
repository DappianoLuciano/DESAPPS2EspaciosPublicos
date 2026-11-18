import request from "supertest";
import { createApp } from "../../src/app";

const mobilityEvent = {
  reclamoId: "reclamo-listado-1",
  correlationId: "correlation-listado-1",
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

describe("listado administrativo de intervenciones de grua", () => {
  it("lista las intervenciones almacenadas temporalmente", async () => {
    const app = createApp();

    await request(app)
      .post("/api/admin/tow-interventions/simulate")
      .set(adminHeaders())
      .send(mobilityEvent)
      .expect(201);

    const response = await request(app)
      .get("/api/admin/tow-interventions")
      .set(adminHeaders())
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      reclamoId: "reclamo-listado-1",
      correlationId: "correlation-listado-1",
      requiereGrua: true,
      status: "PENDING"
    });
  });

  it("devuelve una lista vacia cuando no hay intervenciones", async () => {
    const response = await request(createApp())
      .get("/api/admin/tow-interventions")
      .set(adminHeaders())
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it("impide que un ciudadano consulte el listado", async () => {
    await request(createApp())
      .get("/api/admin/tow-interventions")
      .set(citizenHeaders())
      .expect(403);
  });
});

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
