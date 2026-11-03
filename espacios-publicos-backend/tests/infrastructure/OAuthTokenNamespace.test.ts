import { OAuthServiceTokenProvider } from "../../src/infrastructure/auth/OAuthServiceTokenProvider";
import { readLoggedLines } from "../helpers/logSpy";

const SECRET = "secreto-del-cliente-muy-largo";

function jwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "RS256", kid: "k1" })}.${encode(payload)}.firma-secreta`;
}

// Claims que exige el contrato EDA: token de servicio, audiencia citypass, vigente y del namespace del modulo.
function serviceClaims(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    sub: "svc",
    token_use: "service",
    aud: "citypass",
    namespace: "com.citypass.espacios",
    exp: Math.floor(Date.now() / 1000) + 900,
    ...overrides
  };
}

function tokenResponse(accessToken: string): Response {
  return new Response(JSON.stringify({ access_token: accessToken, expires_in: 900 }), { status: 200 });
}

describe("OAuthServiceTokenProvider: namespace del token", () => {
  let write: jest.SpyInstance;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    write = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
    fetchSpy = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    write.mockRestore();
    fetchSpy.mockRestore();
  });

  const provider = () => new OAuthServiceTokenProvider("https://auth.test/oauth/token", "svc-espacios", SECRET);
  const warnings = () => readLoggedLines(write).filter((line) => line.level === 40);

  it("rechaza un token con otro namespace, sin loguear el token ni el secret", async () => {
    const token = jwt(serviceClaims({ namespace: "com.citypass.reclamos" }));
    fetchSpy.mockResolvedValueOnce(tokenResponse(token));

    await expect(provider().getToken()).rejects.toMatchObject({ statusCode: 502 });

    const output = JSON.stringify(write.mock.calls);
    expect(output).not.toContain(token);
    expect(output).not.toContain("firma-secreta");
    expect(output).not.toContain(SECRET);
    expect(output).not.toContain(Buffer.from(`svc-espacios:${SECRET}`).toString("base64"));
  });

  it("rechaza un token sin namespace o que no es un JWT", async () => {
    fetchSpy.mockResolvedValueOnce(tokenResponse(jwt(serviceClaims({ namespace: undefined }))));
    await expect(provider().getToken()).rejects.toMatchObject({ statusCode: 502 });

    fetchSpy.mockResolvedValueOnce(tokenResponse("token-opaco"));
    await expect(provider().getToken()).rejects.toMatchObject({ statusCode: 502 });
  });

  it("acepta el token del namespace del modulo sin avisar", async () => {
    const token = jwt(serviceClaims());
    fetchSpy.mockResolvedValueOnce(tokenResponse(token));

    expect(await provider().getToken()).toBe(token);
    expect(warnings()).toHaveLength(0);
  });

  it("revisa el token al obtenerlo, no en cada uso del cache", async () => {
    fetchSpy.mockResolvedValueOnce(tokenResponse(jwt(serviceClaims())));
    const tokenProvider = provider();

    await tokenProvider.getToken();
    await tokenProvider.getToken();
    await tokenProvider.getToken();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
