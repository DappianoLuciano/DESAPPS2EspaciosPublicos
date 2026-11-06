import { PublicSpaceAffectedPublisher, stableAffectationId } from "../../src/application/events/publicSpaceAffected";
import { ReceiveGatewayEventUseCase } from "../../src/application/use-cases/ReceiveGatewayEventUseCase";
import { DomainEvent } from "../../src/domain/entities/DomainEvent";
import { PublicSpace } from "../../src/domain/entities/PublicSpace";

const near: PublicSpace = {
  id: "space-cerca", name: "Anfiteatro", description: "d", address: "Av. Díaz Vélez", zone: "Caballito", capacity: 1600,
  latitude: -34.6064, longitude: -58.4357, status: "ENABLED", category: "PLAZA", createdAt: new Date()
};
const far: PublicSpace = { ...near, id: "space-lejos", latitude: -34.70, longitude: -58.50 };

function build() {
  const saved: DomainEvent[] = [];
  const recorded = new Set<string>();
  const cityIncidents = { upsertActive: jest.fn(), deactivate: jest.fn(), findActiveInBounds: jest.fn(), findActiveWithoutCoordinatesWithZone: jest.fn() };
  const useCase = new ReceiveGatewayEventUseCase(
    { exists: async (id: string) => recorded.has(id), record: async (id: string) => void recorded.add(id) },
    cityIncidents,
    { findByEventId: jest.fn(), saveIfNewer: jest.fn() } as never,
    { findById: jest.fn() },
    { findAll: jest.fn().mockResolvedValue([near, far]) },
    new PublicSpaceAffectedPublisher({ save: async (e: DomainEvent) => void saved.push(e) }, { publish: jest.fn() })
  );
  return { useCase, saved, cityIncidents };
}

const obstruction = (eventId: string, data: Record<string, unknown> = {}) => ({
  metadata: { eventId, eventType: "com.citypass.movilidad.MovilidadObstruccionEvaluada" },
  data: {
    reclamoId: "rec-9", correlationId: "corr-9", latitud: -34.6070, longitud: -58.4360, direccion: "Av. Díaz Vélez 4800",
    barrio: "Caballito", afectaCiclovia: false, estacionesAfectadasIds: [], impactoCirculacion: "ALTO",
    desvioSugerido: null, requiereIntervencionInmediata: false, requiereGrua: false, evaluadoAt: Date.now(), ...data
  }
});

describe("incidente vial (MovilidadObstruccionEvaluada)", () => {
  it("restringe el acceso a los espacios cercanos con causa INCIDENTE_VIAL y registra el incidente", async () => {
    const { useCase, saved, cityIncidents } = build();

    expect(await useCase.execute(obstruction("evt-1"))).toBe("processed");

    expect(cityIncidents.upsertActive).toHaveBeenCalledWith(expect.objectContaining({
      source: "RECLAMOS", externalId: "rec-9", latitude: -34.607, longitude: -58.436, zone: "Caballito"
    }));
    expect(saved).toHaveLength(1);
    expect(saved[0].payload).toEqual(expect.objectContaining({
      afectacionId: stableAffectationId("INCIDENTE_VIAL", "rec-9", "space-cerca"),
      espacioId: "space-cerca",
      tipoAfectacion: "ACCESO_RESTRINGIDO",
      causaTipo: "INCIDENTE_VIAL",
      causaId: "rec-9"
    }));
  });

  it("con impacto bajo deja el espacio con uso parcial, salvo que requiera intervencion inmediata", async () => {
    const low = build();
    await low.useCase.execute(obstruction("evt-2", { impactoCirculacion: "BAJO" }));
    expect(low.saved[0].payload).toEqual(expect.objectContaining({ tipoAfectacion: "USO_PARCIAL", causaTipo: "INCIDENTE_VIAL" }));

    const urgent = build();
    await urgent.useCase.execute(obstruction("evt-3", { impactoCirculacion: "BAJO", requiereIntervencionInmediata: true }));
    expect(urgent.saved[0].payload).toEqual(expect.objectContaining({ tipoAfectacion: "ACCESO_RESTRINGIDO" }));
  });

  it("sin impacto en la circulacion se ignora", async () => {
    const { useCase, saved, cityIncidents } = build();

    expect(await useCase.execute(obstruction("evt-4", { impactoCirculacion: "NINGUNO" }))).toBe("ignored");

    expect(saved).toHaveLength(0);
    expect(cityIncidents.upsertActive).not.toHaveBeenCalled();
  });

  it("una reevaluacion del mismo reclamo conserva el afectacionId", async () => {
    const { useCase, saved } = build();

    await useCase.execute(obstruction("evt-5"));
    await useCase.execute(obstruction("evt-6", { impactoCirculacion: "MEDIO" }));

    expect(saved).toHaveLength(2);
    expect(saved[0].payload.afectacionId).toBe(saved[1].payload.afectacionId);
  });
});

describe("ReclamoReclasificado", () => {
  const reclassified = (eventId: string, data: Record<string, unknown>) => ({
    metadata: { eventId, eventType: "com.citypass.reclamos.ReclamoReclasificado" },
    data: { reclamoId: "rec-3", categoriaNueva: "BACHE", latitud: -34.6070, longitud: -58.4360, barrio: "Caballito", ...data }
  });

  it("si pasa a cortar la circulacion: incidente activo y USO_PARCIAL con causa RECLAMO", async () => {
    const { useCase, saved, cityIncidents } = build();

    await useCase.execute(reclassified("evt-7", { afectaCirculacionAnterior: false, afectaCirculacionNueva: true }));

    expect(cityIncidents.upsertActive).toHaveBeenCalledWith(expect.objectContaining({ externalId: "rec-3", category: "BACHE" }));
    expect(saved).toHaveLength(1);
    expect(saved[0].payload).toEqual(expect.objectContaining({ tipoAfectacion: "USO_PARCIAL", causaTipo: "RECLAMO", causaId: "rec-3" }));
  });

  it("si deja de cortarla cierra el incidente sin publicar", async () => {
    const { useCase, saved, cityIncidents } = build();

    await useCase.execute(reclassified("evt-8", { afectaCirculacionAnterior: true, afectaCirculacionNueva: false }));

    expect(cityIncidents.deactivate).toHaveBeenCalledWith("RECLAMOS", "rec-3");
    expect(saved).toHaveLength(0);
  });

  it("una reclasificacion sin impacto en la circulacion se ignora", async () => {
    const { useCase, saved } = build();

    expect(await useCase.execute(reclassified("evt-9", { afectaCirculacionAnterior: false, afectaCirculacionNueva: false }))).toBe("ignored");
    expect(saved).toHaveLength(0);
  });
});

it("stableAffectationId devuelve un UUID v5 estable", () => {
  const id = stableAffectationId("INCIDENTE_VIAL", "rec-9", "space-cerca");
  expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(stableAffectationId("INCIDENTE_VIAL", "rec-9", "space-cerca")).toBe(id);
  expect(stableAffectationId("RECLAMO", "rec-9", "space-cerca")).not.toBe(id);
});
