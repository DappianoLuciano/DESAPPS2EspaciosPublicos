import request from "supertest";
import { createApp } from "../../src/app";

describe("seguridad de la autenticacion simulada", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalLifecycleEvent = process.env.npm_lifecycle_event;
  const originalCorsOrigins = process.env.CORS_ALLOWED_ORIGINS;

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }

    if (originalLifecycleEvent === undefined) {
      delete process.env.npm_lifecycle_event;
    } else {
      process.env.npm_lifecycle_event = originalLifecycleEvent;
    }

    if (originalCorsOrigins === undefined) {
      delete process.env.CORS_ALLOWED_ORIGINS;
    } else {
      process.env.CORS_ALLOWED_ORIGINS = originalCorsOrigins;
    }
  });

  it("permite el login simulado fuera de produccion", async () => {
    process.env.NODE_ENV = "test";
    const app = createApp();

    const response = await request(app)
      .post("/api/auth/mock-login")
      .set("x-forwarded-proto", "https")
      .send({ email: "ciudadano", password: "1234" })
      .expect(200);

    expect(response.body.user).toMatchObject({
      id: "citizen-1",
      email: "ciudadano@citypass.test",
      role: "citizen"
    });
  });

  it("bloquea el login simulado en produccion", async () => {
    process.env.NODE_ENV = "production";
    const app = createApp();

    const response = await request(app)
      .post("/api/auth/mock-login")
      .set("x-forwarded-proto", "https")
      .send({ email: "ciudadano", password: "1234" })
      .expect(403);

    expect(response.body).toMatchObject({
      message: "El acceso simulado no esta disponible en produccion.",
      requestId: expect.any(String)
    });
  });

  it("ignora cabeceras de identidad simulada en produccion", async () => {
    process.env.NODE_ENV = "production";
    const app = createApp();

    await request(app)
      .post("/api/public-spaces")
      .set("x-forwarded-proto", "https")
      .set("x-user-id", "attacker")
      .set("x-user-name", "Administrador falso")
      .set("x-user-email", "attacker@example.com")
      .set("x-user-role", "municipal_admin")
      .send({})
      .expect(401);
  });

  it("aplica el modo seguro si NODE_ENV falta fuera de npm run dev", async () => {
    delete process.env.NODE_ENV;
    process.env.npm_lifecycle_event = "start";

    const response = await request(createApp())
      .post("/api/auth/mock-login")
      .set("x-forwarded-proto", "https")
      .send({ email: "ciudadano", password: "1234" })
      .expect(403);

    expect(response.body.message).toBe(
      "El acceso simulado no esta disponible en produccion."
    );
  });

  it("no anuncia las cabeceras mock como permitidas en produccion", async () => {
    process.env.NODE_ENV = "production";
    process.env.CORS_ALLOWED_ORIGINS = "https://frontend.example";

    const response = await request(createApp())
      .options("/api/public-spaces")
      .set("x-forwarded-proto", "https")
      .set("Origin", "https://frontend.example")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type,x-user-role")
      .expect(204);

    expect(response.headers["access-control-allow-headers"]).toBe(
      "Content-Type,Authorization"
    );
  });
});
