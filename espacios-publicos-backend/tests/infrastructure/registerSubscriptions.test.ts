import { GATEWAY_SUBSCRIPTION_TOPICS } from "../../src/application/use-cases/ReceiveGatewayEventUseCase";
import {
  buildCallbackUrl,
  maskCallbackUrl,
  registerSubscriptions
} from "../../src/infrastructure/events/registerSubscriptions";

const WEBHOOK_TOKEN = "tok/en+con&simbolos=raros";
const BACKEND = "https://espacios-publicos-backend.vercel.app";
const GATEWAY = "https://gateway.test/api/v1";

describe("topicos de suscripcion", () => {
  it("son los cinco que procesa el webhook, en orden", () => {
    expect([...GATEWAY_SUBSCRIPTION_TOPICS]).toEqual([
      "com.citypass.movilidad.RecomendacionDestinoActualizada",
      "com.citypass.reclamos.ReclamoCreado",
      "com.citypass.reclamos.ReclamoActualizado",
      "com.citypass.emergencias.EmergenciaCreada",
      "com.citypass.emergencias.EmergenciaActualizada"
    ]);
  });
});

describe("buildCallbackUrl / maskCallbackUrl", () => {
  it("arma {PUBLIC_BACKEND_URL}/webhooks/citypass?token={token}", () => {
    expect(buildCallbackUrl(`${BACKEND}/`, "abc123")).toBe(`${BACKEND}/webhooks/citypass?token=abc123`);
  });

  it("codifica el token para que el webhook reciba el valor original", () => {
    const url = new URL(buildCallbackUrl(BACKEND, WEBHOOK_TOKEN));

    expect(url.searchParams.get("token")).toBe(WEBHOOK_TOKEN);
  });

  it("rechaza una PUBLIC_BACKEND_URL invalida", () => {
    expect(() => buildCallbackUrl("no es una url", "abc")).toThrow("PUBLIC_BACKEND_URL");
  });

  it("enmascara el token y deja el resto de la URL", () => {
    expect(maskCallbackUrl(buildCallbackUrl(BACKEND, WEBHOOK_TOKEN))).toBe(`${BACKEND}/webhooks/citypass?token=***`);
  });
});

describe("registerSubscriptions", () => {
  const callbackUrl = buildCallbackUrl(BACKEND, WEBHOOK_TOKEN);
  const tokenProvider = { getToken: jest.fn().mockResolvedValue("access-token-de-servicio") };

  function run(fetchMock: jest.Mock, topics = GATEWAY_SUBSCRIPTION_TOPICS) {
    const lines: string[] = [];
    const promise = registerSubscriptions({
      gatewayUrl: `${GATEWAY}/`,
      tokenProvider,
      topics,
      callbackUrl,
      webhookToken: WEBHOOK_TOKEN,
      fetchFn: fetchMock,
      log: (line) => lines.push(line)
    });

    return { promise, lines };
  }

  it("hace un POST /subscriptions con {topic, callbackUrl} por cada topico y con el token de servicio", async () => {
    const fetchMock = jest.fn().mockImplementation(async () => new Response("{}", { status: 201 }));

    const { promise } = run(fetchMock);
    const results = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(5);
    for (const [index, topic] of GATEWAY_SUBSCRIPTION_TOPICS.entries()) {
      const [url, init] = fetchMock.mock.calls[index];
      expect(url).toBe(`${GATEWAY}/subscriptions`);
      expect(init.method).toBe("POST");
      expect(init.headers.Authorization).toBe("Bearer access-token-de-servicio");
      expect(JSON.parse(init.body)).toEqual({ topic, callbackUrl });
      expect(results[topic]).toBe("registrada");
    }
  });

  it("ante un 409 informa que ya existia y sigue con el resto", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 201 }))
      .mockResolvedValueOnce(new Response("{}", { status: 409 }))
      .mockResolvedValue(new Response("{}", { status: 201 }));

    const { promise, lines } = run(fetchMock);
    const results = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(results["com.citypass.reclamos.ReclamoCreado"]).toBe("ya existia");
    expect(lines[1]).toContain("com.citypass.reclamos.ReclamoCreado: ya existía");
    expect(lines[0]).toContain("registrada");
  });

  it("la salida muestra la URL con el token enmascarado y nunca el token", async () => {
    const fetchMock = jest.fn().mockImplementation(async () => new Response("{}", { status: 201 }));

    const { promise, lines } = run(fetchMock);
    await promise;

    expect(lines).toHaveLength(5);
    for (const line of lines) {
      expect(line).toContain(`${BACKEND}/webhooks/citypass?token=***`);
      expect(line).not.toContain(WEBHOOK_TOKEN);
      expect(line).not.toContain(encodeURIComponent(WEBHOOK_TOKEN));
    }
  });

  it("un error distinto de 409 corta y no filtra el token aunque el gateway lo repita", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(new Response(`callback invalida: ${callbackUrl} / ${WEBHOOK_TOKEN}`, { status: 400 }));

    const { promise } = run(fetchMock);

    const error = (await promise.then(
      () => new Error("debia fallar"),
      (caught: Error) => caught
    )) as Error;

    expect(error.message).toContain("com.citypass.movilidad.RecomendacionDestinoActualizada: 400");
    expect(error.message).not.toContain(WEBHOOK_TOKEN);
    expect(error.message).not.toContain(encodeURIComponent(WEBHOOK_TOKEN));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
