const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveWeatherNeighborhoods } = require("../../src/domain/services/resolveWeatherNeighborhoods");
const { weatherLocations } = require("../../src/domain/catalogs/weatherLocations");
const { WeatherAlertController } = require("../../src/interfaces/http/controllers/WeatherAlertController");
const { OpenMeteoWeatherProvider } = require("../../src/infrastructure/weather/OpenMeteoWeatherProvider");
const { ConfirmWeatherAlertUseCase } = require("../../src/application/use-cases/ConfirmWeatherAlertUseCase");
const { PrismaWeatherAlertRepository } = require("../../src/infrastructure/database/PrismaWeatherAlertRepository");
const { prisma } = require("../../src/infrastructure/database/prismaClient");
const { PrismaEventOutboxRepository } = require("../../src/infrastructure/database/PrismaEventOutboxRepository");

test("barrios por poligono, sin extrapolar al mas cercano", () => {
  assert.deepEqual(resolveWeatherNeighborhoods([{ latitude: -34.6037, longitude: -58.3816 }]), ["SAN NICOLAS"]);
  assert.deepEqual(resolveWeatherNeighborhoods([{ latitude: 0, longitude: 0 }]), []);
  for (const location of weatherLocations) {
    assert.ok(resolveWeatherNeighborhoods([location]).includes(location.name), location.name);
  }
  assert.deepEqual(resolveWeatherNeighborhoods([weatherLocations[0], weatherLocations[0]]), [weatherLocations[0].name]);
});

test("consultar clima solo detecta: no ejecuta cierres ni publicaciones", async () => {
  let checked = 0;
  const controller = new WeatherAlertController(null, null, {
    execute: async () => { checked++; return { riskDetected: false }; }
  }, null, null, null, null);
  let result;
  await controller.checkNow({}, { json: (data) => { result = data; } });
  assert.equal(checked, 1);
  assert.deepEqual(result, { weatherCheck: { riskDetected: false } });
});

test("consultas simultaneas comparten peticion Open-Meteo y luego usan cache", async () => {
  const original = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return new Response(JSON.stringify({ hourly: {
      time: [1800000000], precipitation: [0], wind_gusts_10m: [10], weather_code: [1], temperature_2m: [20]
    } }));
  };
  try {
    const provider = new OpenMeteoWeatherProvider({ zone: "CABA", latitude: -34.6, longitude: -58.4, forecastHours: 24 });
    await Promise.all([provider.getForecasts(), provider.getForecasts()]);
    await provider.getForecasts();
    assert.equal(calls, 1);
  } finally { global.fetch = original; }
});

test("confirmacion incluye barrios calculados, no inferidos de un nombre arbitrario", async () => {
  let event;
  const now = Date.now();
  const current = { id: "test", validFrom: new Date(now), phenomenon: "OLA_DE_CALOR",
    latitude: -34.6037, longitude: -58.3816, evidence: { neighborhoods: ["INVENTADO"] } };
  const repo = { findById: async () => current,
    confirmWithEvent: async (_a, _b, _c, _d, value) => { event = value; return current; } };
  const useCase = new ConfirmWeatherAlertUseCase(repo, {
    execute: async () => ({ processed: 1, published: 1, failed: 0 })
  });
  await useCase.execute({ alertId: "test", actorSub: "admin", criticality: "ALTA",
    validUntil: new Date(now + 3600000).toISOString() });
  assert.deepEqual(event.payload.barrios, ["SAN NICOLAS"]);
  assert.equal(event.payload.alertaId, "test");
});

test("el ciclo EDA solo selecciona vencidas confirmadas para ese canal", async () => {
  const original = prisma.weatherAlert.findMany;
  const driver = process.env.EVENT_BUS_DRIVER;
  let query;
  process.env.EVENT_BUS_DRIVER = "citypass";
  prisma.weatherAlert.findMany = async (options) => { query = options; return []; };
  try {
    await new PrismaWeatherAlertRepository().findExpiredConfirmed(new Date());
    assert.deepEqual(query.where.evidence, { path: ["publicationChannel"], equals: "citypass" });
  } finally {
    prisma.weatherAlert.findMany = original;
    if (driver === undefined) delete process.env.EVENT_BUS_DRIVER;
    else process.env.EVENT_BUS_DRIVER = driver;
  }
});

test("un cierre espera la publicacion de su confirmacion", async () => {
  const originalMany = prisma.eventOutbox.findMany;
  const originalFirst = prisma.eventOutbox.findFirst;
  const driver = process.env.EVENT_BUS_DRIVER;
  process.env.EVENT_BUS_DRIVER = "citypass";
  const close = { id: "close", name: "com.citypass.espacios.CriticidadClimaticaFinalizada",
    payload: { alertaId: "a1" }, status: "PENDING", attempts: 0 };
  prisma.eventOutbox.findMany = async () => [close];
  try {
    prisma.eventOutbox.findFirst = async () => null;
    const repository = new PrismaEventOutboxRepository();
    assert.equal((await repository.findReady(25, new Date())).length, 0);
    prisma.eventOutbox.findFirst = async (query) => {
      assert.equal(query.where.status, "PUBLISHED");
      assert.equal(query.where.payload.equals, "a1");
      return { id: "confirmation" };
    };
    assert.equal((await repository.findReady(25, new Date())).length, 1);
  } finally {
    prisma.eventOutbox.findMany = originalMany;
    prisma.eventOutbox.findFirst = originalFirst;
    if (driver === undefined) delete process.env.EVENT_BUS_DRIVER;
    else process.env.EVENT_BUS_DRIVER = driver;
  }
});
