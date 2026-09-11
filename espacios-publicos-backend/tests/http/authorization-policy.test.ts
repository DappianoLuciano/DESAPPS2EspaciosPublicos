import request from "supertest";
import { createApp } from "../../src/app";
import { hasPermission, permissions } from "../../src/interfaces/http/auth/permissions";

describe("politica de autorizacion", () => {
  let auditLog: jest.SpyInstance;

  beforeEach(() => {
    auditLog = jest.spyOn(console, "info").mockImplementation();
  });

  afterEach(() => {
    auditLog.mockRestore();
  });

  it("asigna capacidades diferentes a ciudadanos y administradores", () => {
    expect(hasPermission("citizen", permissions.CREATE_RESERVATION)).toBe(true);
    expect(hasPermission("citizen", permissions.CREATE_COMMUNITY_EVENT)).toBe(false);
    expect(hasPermission("municipal_admin", permissions.CREATE_COMMUNITY_EVENT)).toBe(true);
    expect(hasPermission("municipal_admin", permissions.CREATE_RESERVATION)).toBe(false);
  });

  it("rechaza a un ciudadano en operaciones administrativas", async () => {
    const response = await request(createApp())
      .post("/api/community-events")
      .set(citizenHeaders())
      .send({})
      .expect(403);

    expect(response.body.message).toBe("Tu perfil no tiene permisos para realizar esta accion.");
    expect(auditLog).toHaveBeenCalledWith(
      "[SecurityAudit]",
      expect.objectContaining({
        actorId: "citizen-1",
        action: permissions.CREATE_COMMUNITY_EVENT,
        outcome: "denied",
        statusCode: 403
      })
    );
  });

  it("rechaza a un administrador en operaciones exclusivas del ciudadano", async () => {
    const response = await request(createApp())
      .post("/api/reservations")
      .set(adminHeaders())
      .send({})
      .expect(403);

    expect(response.body.message).toBe("Tu perfil no tiene permisos para realizar esta accion.");
  });

  it("responde 401 cuando falta identidad", async () => {
    const response = await request(createApp()).get("/api/admin/profile").expect(401);

    expect(response.body.message).toBe("Tenes que iniciar sesion para realizar esta accion.");
  });

  it("no registra correo ni contraseña en intentos de login rechazados", async () => {
    await request(createApp())
      .post("/api/auth/mock-login")
      .send({ email: "persona@example.com", password: "secreto-no-registrar" })
      .expect(401);

    const serializedLogs = JSON.stringify(auditLog.mock.calls);
    expect(serializedLogs).not.toContain("persona@example.com");
    expect(serializedLogs).not.toContain("secreto-no-registrar");
  });
});

function citizenHeaders(): Record<string, string> {
  return {
    "x-user-id": "citizen-1",
    "x-user-name": "Ciudadano de prueba",
    "x-user-email": "ciudadano@citypass.test",
    "x-user-role": "citizen"
  };
}

function adminHeaders(): Record<string, string> {
  return {
    "x-user-id": "admin-1",
    "x-user-name": "Gestion Municipal",
    "x-user-email": "admin@citypass.test",
    "x-user-role": "municipal_admin"
  };
}
