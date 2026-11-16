import request from "supertest";
import { createApp } from "../../src/app";

const mobilityEvent = {
  reclamoId: "reclamo-simulado-1",
  correlationId: "correlation-simulada-1",
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

describe("simulacion de eventos de Movilidad", () => {
  it("permite al administrador simular un caso con grua", async () => {
    const response = await request(createApp())
      .post("/api/admin/tow-interventions/simulate")
      .set(adminHeaders())
      .send(mobilityEvent)
      .expect(201);

    expect(response.body).toMatchObject({
      reclamoId: "reclamo-simulado-1",
      requiereGrua: true,
      status: "PENDING",
      patente: null,
      solicitadoAt: null,
      resueltoAt: null
    });
  });

  it("finaliza automaticamente el caso simulado sin grua", async () => {
    const response = await request(createApp())
      .post("/api/admin/tow-interventions/simulate")
      .set(adminHeaders())
      .send({
        ...mobilityEvent,
        reclamoId: "reclamo-simulado-2",
        requiereGrua: false
      })
      .expect(201);

    expect(response.body).toMatchObject({
      requiereGrua: false,
      status: "COMPLETED",
      patente: null,
      solicitadoAt: null
    });
    expect(response.body.resueltoAt).toEqual(expect.any(String));
  });

  it("rechaza la simulacion de un ciudadano", async () => {
    await request(createApp())
      .post("/api/admin/tow-interventions/simulate")
      .set(citizenHeaders())
      .send(mobilityEvent)
      .expect(403);
  });

  it("rechaza campos no definidos por el contrato", async () => {
    const response = await request(createApp())
      .post("/api/admin/tow-interventions/simulate")
      .set(adminHeaders())
      .send({ ...mobilityEvent, campoInventado: true })
      .expect(400);

    expect(response.body.message).toBe(
      "La solicitud contiene campos no permitidos."
    );
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
