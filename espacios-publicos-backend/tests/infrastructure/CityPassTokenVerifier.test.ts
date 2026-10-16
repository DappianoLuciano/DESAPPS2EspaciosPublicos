import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import {
  CityPassTokenVerifier,
  JwkKey
} from "../../src/infrastructure/auth/CityPassTokenVerifier";

describe("CityPassTokenVerifier", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048
  });

  const jwk = publicKey.export({ format: "jwk" }) as JwkKey;
  jwk.kid = "test-key-1";
  jwk.alg = "RS256";
  jwk.use = "sig";

  const issuer = "https://idp.citypass.local";
  const audience = "citypass-espacios-api";

  const createVerifier = (overrides = {}) => {
    return new CityPassTokenVerifier({
      issuer,
      audience,
      jwksUrl: "https://idp.citypass.local/.well-known/jwks.json",
      adminGroups: ["admin", "espacios-admin", "soporte-n2"],
      fetchJwksFn: async () => ({ keys: [jwk] }),
      clockToleranceSeconds: 5,
      ...overrides
    });
  };

  const createToken = (payloadOverrides: Record<string, unknown> = {}, signOptionsOverrides: jwt.SignOptions = {}) => {
    const payload = {
      iss: issuer,
      sub: "U000042",
      aud: [audience],
      token_use: "human",
      ver: 1,
      preferred_username: "jperez",
      module: "espacios-publicos",
      groups: ["soporte-n2"],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900,
      jti: "test-jti-12345",
      ...payloadOverrides
    };

    return jwt.sign(payload, privateKey, {
      algorithm: "RS256",
      keyid: "test-key-1",
      noTimestamp: true,
      ...signOptionsOverrides
    });
  };

  it("verifica exitosamente un token RS256 valido y reconoce rol admin", async () => {
    const verifier = createVerifier();
    const token = createToken();

    const identity = await verifier.verify(token);

    expect(identity).not.toBeNull();
    expect(identity?.sub).toBe("U000042");
    expect(identity?.preferredUsername).toBe("jperez");
    expect(identity?.groups).toEqual(["soporte-n2"]);
    expect(identity?.isAdmin).toBe(true);
    expect(identity?.jti).toBe("test-jti-12345");
  });

  it("identifica como no admin a usuarios sin grupos administrativos conocidos", async () => {
    const verifier = createVerifier();
    const token = createToken({ groups: ["consulta", "ciudadano"] });

    const identity = await verifier.verify(token);

    expect(identity).not.toBeNull();
    expect(identity?.isAdmin).toBe(false);
  });

  it("admite tokens con lista de grupos vacia (usuario sin accesos)", async () => {
    const verifier = createVerifier();
    const token = createToken({ groups: [] });

    const identity = await verifier.verify(token);

    expect(identity).not.toBeNull();
    expect(identity?.groups).toEqual([]);
    expect(identity?.isAdmin).toBe(false);
  });

  it("rechaza tokens vencidos", async () => {
    const verifier = createVerifier();
    const expiredToken = createToken({
      exp: Math.floor(Date.now() / 1000) - 300
    });

    const identity = await verifier.verify(expiredToken);

    expect(identity).toBeNull();
  });

  it("rechaza tokens sin claim exp (trampa obligatoria del contrato)", async () => {
    const verifier = createVerifier();
    const payload = {
      iss: issuer,
      sub: "U000042",
      aud: [audience],
      token_use: "human",
      ver: 1,
      preferred_username: "jperez",
      groups: ["soporte-n2"]
    };
    const tokenWithoutExp = jwt.sign(payload, privateKey, {
      algorithm: "RS256",
      keyid: "test-key-1",
      noTimestamp: true
    });

    const identity = await verifier.verify(tokenWithoutExp);

    expect(identity).toBeNull();
  });

  it("rechaza tokens con firma RSA invalida o clave ajena", async () => {
    const otherPair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const forgedToken = jwt.sign(
      {
        iss: issuer,
        sub: "U000099",
        aud: [audience],
        token_use: "human",
        ver: 1,
        exp: Math.floor(Date.now() / 1000) + 900
      },
      otherPair.privateKey,
      { algorithm: "RS256", keyid: "test-key-1" }
    );

    const verifier = createVerifier();
    const identity = await verifier.verify(forgedToken);

    expect(identity).toBeNull();
  });

  it("rechaza tokens con issuer diferente", async () => {
    const verifier = createVerifier();
    const wrongIssuerToken = createToken({ iss: "https://idp.otro-sitio.local" });

    const identity = await verifier.verify(wrongIssuerToken);

    expect(identity).toBeNull();
  });

  it("rechaza tokens si aud no incluye la audiencia de este modulo", async () => {
    const verifier = createVerifier();
    const wrongAudienceToken = createToken({ aud: ["citypass-reclamos-api"] });

    const identity = await verifier.verify(wrongAudienceToken);

    expect(identity).toBeNull();
  });

  it("admite aud como string en modo compatible y lo rechaza con strictAudienceList", async () => {
    const defaultVerifier = createVerifier();
    const strictVerifier = createVerifier({ strictAudienceList: true });
    const stringAudToken = createToken({ aud: audience });

    const identityCompatible = await defaultVerifier.verify(stringAudToken);
    expect(identityCompatible).not.toBeNull();
    expect(identityCompatible?.sub).toBe("U000042");

    const identityStrict = await strictVerifier.verify(stringAudToken);
    expect(identityStrict).toBeNull();
  });

  it("bloquea el ataque alg: none (lista blanca estricta RS256)", async () => {
    const verifier = createVerifier();
    const noneToken = `${Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")}.${Buffer.from(
      JSON.stringify({
        iss: issuer,
        sub: "U000042",
        aud: [audience],
        token_use: "human",
        ver: 1,
        groups: ["admin"],
        exp: Math.floor(Date.now() / 1000) + 900
      })
    ).toString("base64url")}.`;

    const identity = await verifier.verify(noneToken);

    expect(identity).toBeNull();
  });

  it("bloquea ataques de suplantacion con algoritmos simetricos (HS256)", async () => {
    const verifier = createVerifier();
    const symmetricToken = jwt.sign(
      {
        iss: issuer,
        sub: "U000042",
        aud: [audience],
        token_use: "human",
        ver: 1,
        groups: ["admin"],
        exp: Math.floor(Date.now() / 1000) + 900
      },
      "secreto-simetrico-falso",
      { algorithm: "HS256", keyid: "test-key-1" }
    );

    const identity = await verifier.verify(symmetricToken);

    expect(identity).toBeNull();
  });

  it("rechaza tokens de servicio (token_use: service) en endpoint de personas", async () => {
    const verifier = createVerifier();
    const serviceToken = createToken({ token_use: "service" });

    const identity = await verifier.verify(serviceToken);

    expect(identity).toBeNull();
  });

  it("rechaza tokens con version diferente a 1", async () => {
    const verifier = createVerifier();
    const wrongVerToken = createToken({ ver: 2 });

    const identity = await verifier.verify(wrongVerToken);

    expect(identity).toBeNull();
  });

  it("rechaza tokens si kid no esta registrado en el JWKS", async () => {
    const verifier = createVerifier();
    const unknownKidToken = createToken({}, { keyid: "kid-desconocido" });

    const identity = await verifier.verify(unknownKidToken);

    expect(identity).toBeNull();
  });
});
