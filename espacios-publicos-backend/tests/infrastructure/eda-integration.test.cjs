const test = require("node:test");
const assert = require("node:assert/strict");
const { OAuthServiceTokenProvider } = require("../../src/infrastructure/auth/OAuthServiceTokenProvider");
const { CityPassEventGatewayBus } = require("../../src/infrastructure/events/CityPassEventGatewayBus");
const { PublishPendingOutboxEventsUseCase } = require("../../src/application/use-cases/PublishPendingOutboxEventsUseCase");

function token(namespace = "com.citypass.espacios") {
  return "header." + Buffer.from(JSON.stringify({
    token_use: "service", namespace, aud: ["citypass"], exp: Math.floor(Date.now()/1000)+900
  })).toString("base64url") + ".signature";
}

test("integracion EDA con transporte HTTP simulado", async (t) => {
  const originalFetch = global.fetch;
  const originalNamespace = process.env.EVENT_NAMESPACE;
  process.env.EVENT_NAMESPACE = "com.citypass.espacios";
  t.after(() => {
    global.fetch = originalFetch;
    if (originalNamespace === undefined) delete process.env.EVENT_NAMESPACE;
    else process.env.EVENT_NAMESPACE = originalNamespace;
  });

  await t.test("obtiene y reutiliza un token de servicio, sin reenviar credenciales a EDA", async () => {
    let calls = 0;
    global.fetch = async (_url, options) => {
      calls++;
      assert.equal(options.body.get("grant_type"), "client_credentials");
      assert.ok(options.headers.Authorization.startsWith("Basic "));
      return new Response(JSON.stringify({ access_token: token(), expires_in: 900 }));
    };
    const provider = new OAuthServiceTokenProvider("https://idp.test/oauth/token", "grupo7", "test-secret");
    assert.equal(await provider.getToken(), await provider.getToken());
    assert.equal(calls, 1);
  });

  await t.test("rechaza un token con namespace incorrecto", async () => {
    global.fetch = async () => new Response(JSON.stringify({ access_token: token("com.citypass.transporte") }));
    const provider = new OAuthServiceTokenProvider("https://idp.test/oauth/token", "grupo7", "test-secret");
    await assert.rejects(() => provider.getToken(), /namespace/);
  });

  await t.test("publica solo el payload y renueva una vez ante 401", async () => {
    let attempts = 0, invalidations = 0;
    const event = { id: "local-1", name: "com.citypass.espacios.CriticidadClimaticaFinalizada",
      payload: { alertaId: "alerta-1", finalizadaEn: 123, actorSub: "admin-1" }, occurredAt: new Date() };
    global.fetch = async (url, options) => {
      assert.equal(url, "https://eda.test/api/v1/event-types/" + event.name + "/events");
      assert.deepEqual(JSON.parse(options.body), event.payload);
      assert.equal(options.headers.Authorization, "Bearer test-token");
      return new Response("", { status: ++attempts === 1 ? 401 : 202 });
    };
    const bus = new CityPassEventGatewayBus("https://eda.test/api/v1",
      { getToken: async () => "test-token", invalidate: () => invalidations++ });
    await bus.publish(event);
    assert.equal(attempts, 2);
    assert.equal(invalidations, 1);
  });

  await t.test("un fallo del gateway queda para reintento en Outbox", async () => {
    let failed = 0, published = 0;
    const repo = {
      findReady: async () => [{ id: "local-1", name: "clima", payload: {}, attempts: 0 }],
      markPublished: async () => published++,
      markFailed: async (_id, error, date) => {
        failed++; assert.ok(error.includes("503")); assert.ok(date > new Date());
      }
    };
    global.fetch = async () => new Response("unavailable", { status: 503 });
    const bus = new CityPassEventGatewayBus("https://eda.test/api/v1",
      { getToken: async () => "test-token", invalidate: () => {} });
    const result = await new PublishPendingOutboxEventsUseCase(repo, bus).execute();
    assert.equal(failed, 1); assert.equal(published, 0);
    assert.deepEqual(result, { processed: 1, published: 0, failed: 1 });
  });
});
