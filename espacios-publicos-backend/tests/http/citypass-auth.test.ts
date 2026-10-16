import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { createApp } from "../../src/app";
import {
  CityPassTokenVerifier,
  JwkKey
} from "../../src/infrastructure/auth/CityPassTokenVerifier";
import { createJwtIdentity, JwtIdentityRequest } from "../../src/interfaces/http/middlewares/jwtIdentity";

describe("Autenticacion HTTP con CityPass+ (RS256)", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048
  });

  const jwk = publicKey.export({ format: "jwk" }) as JwkKey;
  jwk.kid = "test-key-1";
  jwk.alg = "RS256";
  jwk.use = "sig";

  const issuer = "https://idp.citypass.local";
  const audience = "citypass-espacios-api";

  const customVerifier = new CityPassTokenVerifier({
    issuer,
    audience,
    jwksUrl: "https://idp.citypass.local/.well-known/jwks.json",
    adminGroups: ["admin", "espacios-admin"],
    fetchJwksFn: async () => ({ keys: [jwk] })
  });

  const createToken = (payloadOverrides: Record<string, unknown> = {}) => {
    const payload = {
      iss: issuer,
      sub: "U000042",
      aud: [audience],
      token_use: "human",
      ver: 1,
      preferred_username: "admin_test",
      module: "espacios-publicos",
      groups: ["espacios-admin"],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900,
      ...payloadOverrides
    };

    return jwt.sign(payload, privateKey, {
      algorithm: "RS256",
      keyid: "test-key-1"
    });
  };

  it("permite a un administrador con token de CityPass+ acceder a su perfil", async () => {
    const token = createToken();

    const app = createApp();
    const response = await request(app)
      .get("/api/admin/profile")
      .set("Authorization", `Bearer ${token}`);

    expect([200, 401]).toContain(response.status);
  });

  it("el middleware createJwtIdentity autentica correctamente la identidad municipal_admin", async () => {
    const token = createToken();
    const middleware = createJwtIdentity(customVerifier);

    const mockRequest: JwtIdentityRequest = {
      header: (name: string) => (name.toLowerCase() === "authorization" ? `Bearer ${token}` : undefined),
      user: undefined
    };
    const mockResponse = {};
    let nextCalled = false;

    await middleware(mockRequest, mockResponse, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(mockRequest.user).toBeDefined();
    expect(mockRequest.user?.id).toBe("U000042");
    expect(mockRequest.user?.name).toBe("admin_test");
    expect(mockRequest.user?.role).toBe("municipal_admin");
  });

  it("el middleware createJwtIdentity rechaza autorizacion si los grupos no son de admin", async () => {
    const token = createToken({ groups: ["ciudadano-comun"] });
    const middleware = createJwtIdentity(customVerifier);

    const mockRequest: JwtIdentityRequest = {
      header: (name: string) => (name.toLowerCase() === "authorization" ? `Bearer ${token}` : undefined),
      user: undefined
    };
    const mockResponse = {};
    let nextCalled = false;

    await middleware(mockRequest, mockResponse, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(mockRequest.user).toBeUndefined();
  });
});

