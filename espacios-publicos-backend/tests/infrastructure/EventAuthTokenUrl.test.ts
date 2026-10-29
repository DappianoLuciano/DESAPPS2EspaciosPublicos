import {
  DEFAULT_EVENT_AUTH_TOKEN_URL,
  resolveEventAuthTokenUrl
} from "../../src/infrastructure/auth/OAuthServiceTokenProvider";
import { CityPassEventGatewayBus } from "../../src/infrastructure/events/CityPassEventGatewayBus";
import { createEventBus } from "../../src/infrastructure/events/createEventBus";

const NAMES = [
  "EVENT_BUS_DRIVER",
  "EVENT_GATEWAY_API_URL",
  "EVENT_AUTH_TOKEN_URL",
  "EVENT_CLIENT_ID",
  "EVENT_CLIENT_SECRET"
];

describe("EVENT_AUTH_TOKEN_URL por defecto", () => {
  const saved = Object.fromEntries(NAMES.map((name) => [name, process.env[name]]));

  beforeEach(() => NAMES.forEach((name) => delete process.env[name]));
  afterEach(() =>
    NAMES.forEach((name) => {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    })
  );

  it("el default es el emisor OAuth del login federado", () => {
    expect(DEFAULT_EVENT_AUTH_TOKEN_URL).toBe("https://api.citypass-login.pp.ua/oauth/token");
    expect(resolveEventAuthTokenUrl({})).toBe(DEFAULT_EVENT_AUTH_TOKEN_URL);
    expect(resolveEventAuthTokenUrl({ EVENT_AUTH_TOKEN_URL: "   " })).toBe(DEFAULT_EVENT_AUTH_TOKEN_URL);
  });

  it("se puede pisar por entorno", () => {
    expect(resolveEventAuthTokenUrl({ EVENT_AUTH_TOKEN_URL: " https://otro.test/oauth/token " })).toBe(
      "https://otro.test/oauth/token"
    );
  });

  it("el bus del gateway no exige EVENT_AUTH_TOKEN_URL pero si el resto", () => {
    process.env.EVENT_BUS_DRIVER = "citypass";
    expect(() => createEventBus()).toThrow("EVENT_GATEWAY_API_URL");

    process.env.EVENT_GATEWAY_API_URL = "https://gateway.test/api/v1";
    expect(() => createEventBus()).toThrow("EVENT_CLIENT_ID");

    process.env.EVENT_CLIENT_ID = "svc-espacios";
    expect(() => createEventBus()).toThrow("EVENT_CLIENT_SECRET");

    process.env.EVENT_CLIENT_SECRET = "secreto";
    expect(createEventBus()).toBeInstanceOf(CityPassEventGatewayBus);
  });

  it("el bus pide el token al emisor por defecto, con Basic auth, y publica con Bearer", async () => {
    process.env.EVENT_BUS_DRIVER = "citypass";
    process.env.EVENT_GATEWAY_API_URL = "https://gateway.test/api/v1";
    process.env.EVENT_CLIENT_ID = "svc-espacios";
    process.env.EVENT_CLIENT_SECRET = "secreto";
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "tok", expires_in: 900 }), { status: 200 }))
      .mockResolvedValueOnce(new Response("{}", { status: 202 }));

    try {
      await createEventBus().publish({
        id: "e1",
        name: "com.citypass.espacios.ReservaConfirmada",
        payload: {},
        occurredAt: new Date()
      });

      expect(fetchSpy.mock.calls[0][0]).toBe("https://api.citypass-login.pp.ua/oauth/token");
      expect((fetchSpy.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe(
        `Basic ${Buffer.from("svc-espacios:secreto").toString("base64")}`
      );
      expect((fetchSpy.mock.calls[1][1]?.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
