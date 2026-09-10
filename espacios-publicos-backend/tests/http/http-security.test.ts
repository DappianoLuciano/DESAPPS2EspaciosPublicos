import request from "supertest";
import { createApp } from "../../src/app";

describe("seguridad HTTP", () => {
  it("envia cabeceras defensivas y no publica Express", async () => {
    const response = await request(createApp()).get("/health").expect(200);

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("permite el frontend local en desarrollo", async () => {
    const response = await request(createApp())
      .get("/health")
      .set("Origin", "http://localhost:5173")
      .expect(200);

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("rechaza origenes no autorizados", async () => {
    await request(createApp())
      .get("/health")
      .set("Origin", "https://sitio-malicioso.example")
      .expect(403);
  });

  it("rechaza cuerpos JSON mayores a 100 KB", async () => {
    const response = await request(createApp())
      .post("/api/auth/mock-login")
      .send({ email: "ciudadano", password: "x".repeat(110 * 1024) })
      .expect(413);

    expect(response.body.requestId).toEqual(expect.any(String));
  });

  it("responde 400 ante JSON malformado e informa el identificador", async () => {
    const response = await request(createApp())
      .post("/api/auth/mock-login")
      .set("Content-Type", "application/json")
      .send('{"email":')
      .expect(400);

    expect(response.body).toMatchObject({
      message: "El cuerpo JSON de la solicitud no es valido.",
      requestId: expect.any(String)
    });
    expect(response.headers["x-request-id"]).toBe(response.body.requestId);
  });

  it("responde 404 de forma uniforme", async () => {
    const response = await request(createApp()).get("/ruta-inexistente").expect(404);

    expect(response.body).toMatchObject({
      message: "Ruta no encontrada.",
      requestId: expect.any(String)
    });
  });

  it("rechaza campos inesperados antes de procesar el endpoint", async () => {
    const response = await request(createApp())
      .post("/api/auth/mock-login")
      .send({ email: "ciudadano", password: "1234", role: "municipal_admin" })
      .expect(400);

    expect(response.body.message).toBe("La solicitud contiene campos no permitidos.");
  });

  it("rechaza booleanos de consulta ambiguos antes de acceder a datos", async () => {
    const response = await request(createApp())
      .get("/api/community-events?availableOnly=si")
      .expect(400);

    expect(response.body.message).toBe("El parametro availableOnly debe ser true o false.");
  });

  it("rechaza estados de espacios publicos que no son validos", async () => {
    const response = await request(createApp())
      .get("/api/public-spaces?status=UNKNOWN")
      .expect(400);

    expect(response.body).toMatchObject({
      message: "El parametro status debe ser ENABLED o DISABLED.",
      requestId: expect.any(String)
    });
  });
});
