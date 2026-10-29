import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import express from "express";
import request from "supertest";
import { GetEventRoutePlanUseCase } from "../../src/application/use-cases/GetEventRoutePlanUseCase";
import { CityIncidentRecord } from "../../src/domain/entities/CityIncidentRecord";
import { DestinationRecommendation } from "../../src/domain/entities/DestinationRecommendation";
import { OsrmRoutingService } from "../../src/infrastructure/routing/OsrmRoutingService";
import { RoutePlanController } from "../../src/interfaces/http/controllers/RoutePlanController";
import { errorHandler } from "../../src/interfaces/http/middlewares/errorHandler";
import { requestContext } from "../../src/interfaces/http/middlewares/requestContext";
import { createRoutePlanRoutes } from "../../src/interfaces/http/routes/routePlanRoutes";

const BIKE = "https://bike.test";
const FOOT = "https://foot.test";

const space = {
  id: "space-1",
  name: "Plaza",
  description: "d",
  address: "Av. Siempreviva 742",
  zone: "Centro",
  capacity: 100,
  latitude: -34.6037,
  longitude: -58.3816,
  status: "ENABLED" as const,
  createdAt: new Date()
};

const communityEvent = {
  id: "event-1",
  title: "Feria",
  publicSpaceId: "space-1",
  status: "ACTIVE" as "ACTIVE" | "ACTIVE_FULL" | "CANCELLED"
};

function recommendation(overrides: Partial<DestinationRecommendation> = {}): DestinationRecommendation {
  return {
    eventoId: "event-1",
    estado: "RECOMMENDED",
    estacionId: "30044",
    estacion: "DIAGONAL NORTE",
    latitud: -34.6046,
    longitud: -58.3798,
    lugaresLibres: 9,
    distanciaMetros: 193,
    mensaje: "Te recomendamos DIAGONAL NORTE (193 m)",
    descartadasPorIncidentes: 2,
    calculadaEn: new Date(Date.now() - 5 * 60_000),
    correlationId: "evento-event-1",
    receivedAt: new Date(),
    ...overrides
  };
}

function incident(overrides: Partial<CityIncidentRecord>): CityIncidentRecord {
  return {
    id: "i",
    source: "RECLAMOS",
    externalId: "x",
    category: "BACHE",
    latitude: -34.6037,
    longitude: -58.3816,
    active: true,
    reportedAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function osrm(coordinates: Array<[number, number]>, distance: number, duration: number) {
  return json({ code: "Ok", routes: [{ distance, duration, geometry: { coordinates } }] });
}

// Simula los dos servidores OSRM; cualquier otro destino haria fallar el test.
function mockFetch(overrides: { bike?: () => Response; foot?: () => Response } = {}) {
  return jest.fn(async (input: unknown) => {
    const url = new URL(String(input));

    if (url.origin === BIKE) {
      return (overrides.bike ?? (() => osrm([[-58.4, -34.62], [-58.3798, -34.6046]], 2400.4, 600.2)))();
    }

    if (url.origin === FOOT) {
      return (overrides.foot ?? (() => osrm([[-58.3798, -34.6046], [-58.3816, -34.6037]], 150.6, 120)))();
    }

    throw new Error(`Llamada inesperada a ${url.origin}`);
  });
}

describe("GET /api/community-events/:id/route-plan", () => {
  const originalFetch = global.fetch;
  const findActiveInBounds = jest.fn();
  let eventRecord: typeof communityEvent | null;
  let spaceRecord: typeof space | null;
  let recommendationRecord: DestinationRecommendation | null;

  function buildApp() {
    const useCase = new GetEventRoutePlanUseCase(
      { findById: async () => eventRecord } as never,
      { findById: async () => spaceRecord } as never,
      { findActiveInBounds } as never,
      { findByEventId: async () => recommendationRecord, saveIfNewer: jest.fn() },
      new OsrmRoutingService({ bike: BIKE, foot: FOOT })
    );
    const app = express();
    app.use(requestContext);
    app.use("/api/community-events", createRoutePlanRoutes(new RoutePlanController(useCase)));
    app.use(errorHandler);
    return app;
  }

  function fetchedUrls(): string[] {
    return (global.fetch as jest.Mock).mock.calls.map(([url]) => String(url));
  }

  beforeEach(() => {
    eventRecord = { ...communityEvent };
    spaceRecord = { ...space };
    recommendationRecord = recommendation();
    findActiveInBounds.mockResolvedValue([]);
    global.fetch = mockFetch() as never;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("arma el plan con la recomendacion guardada y la ubicacion del usuario", async () => {
    const response = await request(buildApp())
      .get("/api/community-events/event-1/route-plan?fromLat=-34.62&fromLng=-58.4")
      .expect(200);

    expect(response.body.destination).toEqual({
      eventId: "event-1",
      title: "Feria",
      latitude: -34.6037,
      longitude: -58.3816,
      address: "Av. Siempreviva 742"
    });
    expect(response.body.dropoff).toEqual({
      stationName: "DIAGONAL NORTE",
      latitude: -34.6046,
      longitude: -58.3798,
      availableSlots: 9,
      distanceMeters: 193,
      message: "Te recomendamos DIAGONAL NORTE (193 m)",
      discardedByIncidents: 2,
      calculatedAt: recommendationRecord!.calculadaEn.toISOString()
    });
    expect(response.body.origin).toEqual({ latitude: -34.62, longitude: -58.4 });
    expect(response.body).not.toHaveProperty("pickup");
    // OSRM devolvio [lng, lat]; el plan debe traer [lat, lng].
    expect(response.body.bikeRoute).toEqual({
      coordinates: [[-34.62, -58.4], [-34.6046, -58.3798]],
      distanceMeters: 2400,
      durationSeconds: 600
    });
    expect(response.body.walkRoute).toEqual({
      coordinates: [[-34.6046, -58.3798], [-34.6037, -58.3816]],
      distanceMeters: 151,
      durationSeconds: 120
    });
    expect(response.body.warnings).toEqual([]);
  });

  it("solo llama a OSRM: origen -> estacion en bici y estacion -> espacio a pie", async () => {
    await request(buildApp())
      .get("/api/community-events/event-1/route-plan?fromLat=-34.62&fromLng=-58.4")
      .expect(200);

    expect(fetchedUrls().sort()).toEqual(
      [
        `${BIKE}/route/v1/driving/-58.4,-34.62;-58.3798,-34.6046?overview=full&geometries=geojson`,
        `${FOOT}/route/v1/driving/-58.3798,-34.6046;-58.3816,-34.6037?overview=full&geometries=geojson`
      ].sort()
    );
  });

  it("sin ubicacion del usuario no hay origen ni ruta en bici, pero si estacion y recorrido a pie", async () => {
    const response = await request(buildApp()).get("/api/community-events/event-1/route-plan").expect(200);

    expect(response.body.origin).toBeNull();
    expect(response.body.bikeRoute).toBeNull();
    expect(response.body.dropoff).not.toBeNull();
    expect(response.body.walkRoute).not.toBeNull();
    expect(response.body.warnings).toEqual([]);
    expect(fetchedUrls()).toHaveLength(1);
    expect(fetchedUrls()[0].startsWith(FOOT)).toBe(true);
  });

  it("sin recomendacion guardada devuelve dropoff null con un warning, sin rutas ni llamadas externas", async () => {
    recommendationRecord = null;

    const response = await request(buildApp())
      .get("/api/community-events/event-1/route-plan?fromLat=-34.62&fromLng=-58.4")
      .expect(200);

    expect(response.body.dropoff).toBeNull();
    expect(response.body.bikeRoute).toBeNull();
    expect(response.body.walkRoute).toBeNull();
    expect(response.body.destination.eventId).toBe("event-1");
    expect(response.body.origin).toEqual({ latitude: -34.62, longitude: -58.4 });
    expect(response.body.warnings).toEqual(["Movilidad todavía no calculó la estación"]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("si el evento esta cancelado no muestra la recomendacion aunque exista", async () => {
    eventRecord = { ...communityEvent, status: "CANCELLED" };

    const response = await request(buildApp())
      .get("/api/community-events/event-1/route-plan?fromLat=-34.62&fromLng=-58.4")
      .expect(200);

    expect(response.body.dropoff).toBeNull();
    expect(response.body.bikeRoute).toBeNull();
    expect(response.body.walkRoute).toBeNull();
    expect(response.body.destination.eventId).toBe("event-1");
    expect(response.body.warnings).toEqual(["El evento fue cancelado."]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("si el espacio esta deshabilitado no muestra la recomendacion aunque exista", async () => {
    spaceRecord = { ...space, status: "DISABLED" as never };

    const response = await request(buildApp()).get("/api/community-events/event-1/route-plan").expect(200);

    expect(response.body.dropoff).toBeNull();
    expect(response.body.warnings).toEqual(["El espacio no esta habilitado."]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("con NO_RECOMMENDATION deja dropoff en null y pasa el mensaje a warnings", async () => {
    recommendationRecord = recommendation({
      estado: "NO_RECOMMENDATION",
      estacion: null,
      latitud: null,
      longitud: null,
      mensaje: "Todas las estaciones cercanas estan afectadas por incidentes"
    });

    const response = await request(buildApp()).get("/api/community-events/event-1/route-plan").expect(200);

    expect(response.body.dropoff).toBeNull();
    expect(response.body.walkRoute).toBeNull();
    expect(response.body.warnings).toEqual(["Todas las estaciones cercanas estan afectadas por incidentes"]);
  });

  it("devuelve igual una recomendacion de hace mas de 30 minutos, con warning", async () => {
    recommendationRecord = recommendation({ calculadaEn: new Date(Date.now() - 45 * 60_000 - 5_000) });

    const response = await request(buildApp()).get("/api/community-events/event-1/route-plan").expect(200);

    expect(response.body.dropoff).not.toBeNull();
    expect(response.body.warnings).toEqual(["La disponibilidad puede haber cambiado (calculada hace 45 min)"]);
  });

  it("no avisa antigüedad si la recomendacion tiene menos de 30 minutos", async () => {
    recommendationRecord = recommendation({ calculadaEn: new Date(Date.now() - 29 * 60_000) });

    const response = await request(buildApp()).get("/api/community-events/event-1/route-plan").expect(200);

    expect(response.body.warnings).toEqual([]);
  });

  it("con el ruteo caido deja las rutas en null y avisa, manteniendo la estacion", async () => {
    global.fetch = mockFetch({
      bike: () => json({ message: "down" }, 503),
      foot: () => json({ code: "NoRoute", routes: [] })
    }) as never;

    const response = await request(buildApp())
      .get("/api/community-events/event-1/route-plan?fromLat=-34.62&fromLng=-58.4")
      .expect(200);

    expect(response.body.bikeRoute).toBeNull();
    expect(response.body.walkRoute).toBeNull();
    expect(response.body.dropoff).not.toBeNull();
    expect(response.body.warnings).toHaveLength(2);
  });

  it("devuelve solo los incidentes activos a 1000 m o menos, ordenados por distancia", async () => {
    findActiveInBounds.mockResolvedValue([
      incident({ externalId: "lejos", category: "OBRA", latitude: -34.6037 + 0.0085 }), // ~945 m
      incident({ externalId: "cerca", category: "BACHE", latitude: -34.6037 + 0.0016 }), // ~178 m
      incident({ externalId: "fuera", category: "OTRO", latitude: -34.6037 + 0.0125 }) // ~1390 m
    ]);

    const response = await request(buildApp()).get("/api/community-events/event-1/route-plan").expect(200);

    expect(response.body.incidents.map((item: { category: string }) => item.category)).toEqual([
      "BACHE",
      "OBRA"
    ]);
    expect(response.body.incidents[0].distanceMeters).toBeGreaterThan(170);
    expect(response.body.incidents[0].distanceMeters).toBeLessThan(185);
  });

  it("responde 404 si el evento no existe", async () => {
    eventRecord = null;

    await request(buildApp()).get("/api/community-events/nada/route-plan").expect(404);
  });

  it("responde 422 si el espacio no tiene coordenadas", async () => {
    spaceRecord = { ...space, latitude: null as never, longitude: null as never };

    await request(buildApp()).get("/api/community-events/event-1/route-plan").expect(422);
  });

  it.each(["fromLat=-34.6", "fromLat=abc&fromLng=-58.4", "fromLat=95&fromLng=-58.4"])(
    "responde 400 con una ubicacion invalida (%s)",
    async (query) => {
      await request(buildApp()).get(`/api/community-events/event-1/route-plan?${query}`).expect(400);
    }
  );
});

describe("el backend no llama a Movilidad", () => {
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith(".ts") ? [path] : [];
    });
  }

  it("no hay codigo que apunte a la API de otro modulo (solo el bus y OSRM)", () => {
    const offenders = sourceFiles(join(__dirname, "..", "..", "src")).filter((file) =>
      /MOVILIDAD_API_URL|stations\/recommendation|movilidad-backend/i.test(readFileSync(file, "utf8"))
    );

    expect(offenders).toEqual([]);
  });
});
