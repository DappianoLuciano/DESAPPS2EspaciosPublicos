import { NearestBikeStationFinder } from "../../src/application/services/NearestBikeStationFinder";
import { GetEventRoutePlanUseCase } from "../../src/application/use-cases/GetEventRoutePlanUseCase";
import { ReceiveGatewayEventUseCase } from "../../src/application/use-cases/ReceiveGatewayEventUseCase";
import { BikeStationRecord } from "../../src/domain/repositories/BikeStationRepository";
import { RoutePoint, RoutingProfile } from "../../src/domain/services/RoutingService";

// Evento en Uade Monserrat; la estacion de devolucion (UADE) la recomendo Movilidad.
const EVENT = { latitude: -34.617126, longitude: -58.3817043 };
const DROPOFF = { latitude: -34.6171, longitude: -58.3815 };
const HOME_PALERMO = { latitude: -34.5889, longitude: -58.4306 };
const HOME_BERNAL = { latitude: -34.7065, longitude: -58.277 };

const station = (id: string, name: string, at: RoutePoint, extra: Partial<BikeStationRecord> = {}): BikeStationRecord => ({
  id, name, ...at, availableBikes: 5, availableSlots: 10, capacity: 15, active: true, updatedAt: new Date(), ...extra
});

function build(stations: BikeStationRecord[]) {
  const legs: Array<{ profile: RoutingProfile; from: RoutePoint; to: RoutePoint }> = [];
  const useCase = new GetEventRoutePlanUseCase(
    { findById: async () => ({ id: "ev-1", title: "Hackatón", publicSpaceId: "sp-1", status: "ACTIVE" }) } as never,
    { findById: async () => ({ id: "sp-1", ...EVENT, address: "Lima 717", status: "ENABLED", zone: null }) } as never,
    { findActiveInBounds: async () => [], findActiveWithoutCoordinatesWithZone: async () => [] } as never,
    {
      findByEventId: async () => ({
        eventoId: "ev-1", estado: "RECOMMENDED" as const, estacionId: "1", estacion: "UADE", latitud: DROPOFF.latitude,
        longitud: DROPOFF.longitude, lugaresLibres: 16, distanciaMetros: 19, mensaje: "ok", descartadasPorIncidentes: 0,
        calculadaEn: new Date(), correlationId: null, receivedAt: new Date()
      }),
      saveIfNewer: jest.fn()
    },
    {
      route: async (profile: RoutingProfile, from: RoutePoint, to: RoutePoint) => {
        legs.push({ profile, from, to });
        return { coordinates: [[from.latitude, from.longitude], [to.latitude, to.longitude]], distanceMeters: 1000, durationSeconds: 300 };
      }
    },
    new NearestBikeStationFinder({ findActive: async () => stations })
  );
  return { useCase, legs };
}

describe("plan de llegada con bici de la ciudad", () => {
  const PLAZA_ITALIA = station("10", "PLAZA ITALIA", { latitude: -34.5810, longitude: -58.4210 });
  const UADE = station("1", "UADE", DROPOFF);

  it("camina a la estacion mas cercana, va en bici hasta la de devolucion y camina al evento", async () => {
    const { useCase, legs } = build([UADE, PLAZA_ITALIA]);

    const plan = await useCase.execute({ eventId: "ev-1", from: HOME_PALERMO });

    expect(plan.pickup).toEqual(expect.objectContaining({ stationName: "PLAZA ITALIA", availableBikes: 5 }));
    expect(legs.map((leg) => leg.profile).sort()).toEqual(["bike", "foot", "foot"]);
    const ride = legs.find((leg) => leg.profile === "bike")!;
    expect(ride.from).toEqual(expect.objectContaining({ latitude: PLAZA_ITALIA.latitude, longitude: PLAZA_ITALIA.longitude }));
    expect(ride.to).toEqual(expect.objectContaining(DROPOFF));
    expect(plan.walkToPickupRoute).not.toBeNull();
    expect(plan.bikeRoute).not.toBeNull();
    expect(plan.walkRoute).not.toBeNull();
    expect(plan.warnings).toEqual([]);
  });

  it("sin estaciones a menos de 5 km (Bernal) no dibuja el tramo en bici y lo avisa", async () => {
    const { useCase, legs } = build([UADE, PLAZA_ITALIA]);

    const plan = await useCase.execute({ eventId: "ev-1", from: HOME_BERNAL });

    expect(plan.pickup).toBeNull();
    expect(plan.bikeRoute).toBeNull();
    expect(legs.map((leg) => leg.profile)).toEqual(["foot"]);
    expect(plan.warnings).toEqual(["No hay estaciones de bicis de la ciudad a menos de 5 km de tu ubicación."]);
  });

  it("avisa si la estacion de retiro no tiene bicis", async () => {
    const { useCase } = build([UADE, { ...PLAZA_ITALIA, availableBikes: 0 }]);

    const plan = await useCase.execute({ eventId: "ev-1", from: HOME_PALERMO });

    expect(plan.warnings).toEqual(["La estación PLAZA ITALIA no tiene bicis disponibles en este momento."]);
  });

  it("si la estacion mas cercana es la misma del evento, sugiere ir caminando", async () => {
    const { useCase, legs } = build([UADE, PLAZA_ITALIA]);

    const plan = await useCase.execute({ eventId: "ev-1", from: { latitude: -34.6175, longitude: -58.3820 } });

    expect(plan.bikeRoute).toBeNull();
    expect(legs.some((leg) => leg.profile === "bike")).toBe(false);
    expect(plan.warnings).toEqual(["Estás cerca del evento: conviene ir caminando."]);
  });

  it("mientras Movilidad no publique estaciones, el tramo en bici sale desde la ubicacion", async () => {
    const { useCase, legs } = build([]);

    const plan = await useCase.execute({ eventId: "ev-1", from: HOME_PALERMO });

    expect(plan.pickup).toBeNull();
    expect(legs.find((leg) => leg.profile === "bike")?.from).toEqual(HOME_PALERMO);
    expect(plan.warnings).toEqual([
      "Todavía no tenemos las estaciones de bicis de la ciudad: el recorrido en bici sale desde tu ubicación."
    ]);
  });
});

describe("EstacionDisponibilidadActualizada", () => {
  function build() {
    const saveIfNewer = jest.fn().mockResolvedValue(true);
    const useCase = new ReceiveGatewayEventUseCase(
      { exists: jest.fn().mockResolvedValue(false), record: jest.fn() },
      {} as never,
      {} as never,
      { findById: jest.fn() },
      undefined,
      undefined,
      undefined,
      { saveIfNewer }
    );
    return { useCase, saveIfNewer };
  }

  const envelope = (data: Record<string, unknown>) => ({
    metadata: { eventId: "evt-1", eventType: "com.citypass.movilidad.EstacionDisponibilidadActualizada" },
    data: {
      estacionId: 44, estacion: "DIAGONAL NORTE", latitud: -34.6046, longitud: -58.3798, bicisDisponibles: 3,
      lugaresLibres: 15, capacidad: 18, activa: true, actualizadaEn: "2026-11-10T13:00:00Z", ...data
    }
  });

  it("guarda la estacion con su disponibilidad", async () => {
    const { useCase, saveIfNewer } = build();

    await expect(useCase.execute(envelope({}))).resolves.toBe("processed");

    expect(saveIfNewer).toHaveBeenCalledWith({
      id: "44", name: "DIAGONAL NORTE", latitude: -34.6046, longitude: -58.3798, availableBikes: 3, availableSlots: 15,
      capacity: 18, active: true, updatedAt: new Date("2026-11-10T13:00:00Z")
    });
  });

  it("ignora un payload sin ubicacion", async () => {
    const { useCase, saveIfNewer } = build();

    await expect(useCase.execute(envelope({ latitud: null }))).resolves.toBe("ignored");
    expect(saveIfNewer).not.toHaveBeenCalled();
  });
});
