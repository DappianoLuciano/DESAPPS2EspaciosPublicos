import { OAuthServiceTokenProvider } from "../../src/infrastructure/auth/OAuthServiceTokenProvider";
import { readLoggedLines } from "../helpers/logSpy";

const SECRET = "secreto-del-cliente-muy-largo";

function jwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "RS256", kid: "k1" })}.${encode(payload)}.firma-secreta`;
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

  it("avisa si el namespace no es com.citypass.espacios, sin loguear el token ni el secret", async () => {
    const token = jwt({ sub: "svc", namespace: "com.citypass.reclamos" });
    fetchSpy.mockResolvedValueOnce(tokenResponse(token));

    expect(await provider().getToken()).toBe(token);

    expect(warnings()).toContainEqual(
      expect.objectContaining({ namespaceEnToken: "com.citypass.reclamos", namespaceEsperado: "com.citypass.espacios" })
    );
    const output = JSON.stringify(write.mock.calls);
    expect(output).not.toContain(token);
    expect(output).not.toContain("firma-secreta");
    expect(output).not.toContain(SECRET);
    expect(output).not.toContain(Buffer.from(`svc-espacios:${SECRET}`).toString("base64"));
  });

  it("avisa si el token no trae namespace o no es un JWT", async () => {
    fetchSpy.mockResolvedValueOnce(tokenResponse(jwt({ sub: "svc" })));
    await provider().getToken();
    fetchSpy.mockResolvedValueOnce(tokenResponse("token-opaco"));
    await provider().getToken();

    expect(warnings()).toHaveLength(2);
    expect(warnings()[0]).toMatchObject({ namespaceEnToken: null });
  });

  it("no avisa cuando el namespace es el del modulo", async () => {
    fetchSpy.mockResolvedValueOnce(tokenResponse(jwt({ sub: "svc", namespace: "com.citypass.espacios" })));

    await provider().getToken();

    expect(warnings()).toHaveLength(0);
  });

  it("revisa el token al obtenerlo, no en cada uso del cache", async () => {
    fetchSpy.mockResolvedValueOnce(tokenResponse(jwt({ sub: "svc", namespace: "otro" })));
    const tokenProvider = provider();

    await tokenProvider.getToken();
    await tokenProvider.getToken();
    await tokenProvider.getToken();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(warnings()).toHaveLength(1);
  });
});
