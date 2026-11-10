import { PublicSpaceAffectedPublisher, stableAffectationId } from "../../src/application/events/publicSpaceAffected";
import { FinishInterventionUseCase } from "../../src/application/use-cases/FinishInterventionUseCase";
import { ReceiveGatewayEventUseCase } from "../../src/application/use-cases/ReceiveGatewayEventUseCase";
import { UpdatePublicSpaceUseCase } from "../../src/application/use-cases/UpdatePublicSpaceUseCase";
import { DomainEvent } from "../../src/domain/entities/DomainEvent";
import { PublicSpace } from "../../src/domain/entities/PublicSpace";
import {
  ActivePublicSpaceAffectation,
  PublicSpaceAffectationFilter,
  PublicSpaceAffectationRepository,
  SavePublicSpaceAffectationData
} from "../../src/domain/repositories/PublicSpaceAffectationRepository";

const AFFECTED = "com.citypass.espacios.EspacioPublicoAfectado";
const RESTORED = "com.citypass.espacios.EspacioPublicoRestaurado";

const space: PublicSpace = {
  id: "space-1", name: "Plaza Houssay", description: "d", address: "Av. Cordoba 2100", zone: "Recoleta",
  capacity: 6000, latitude: -34.5994, longitude: -58.3988, status: "ENABLED", category: "PLAZA", createdAt: new Date()
};

/** Mismo comportamiento que la tabla public_space_affectations, en memoria. */
class InMemoryAffectations implements PublicSpaceAffectationRepository {
  rows = new Map<string, SavePublicSpaceAffectationData & { restoredAt: Date | null }>();

  async saveActive(data: SavePublicSpaceAffectationData) {
    this.rows.set(data.afectacionId, { ...data, restoredAt: null });
  }

  async restore(filter: PublicSpaceAffectationFilter, restoredAt: Date): Promise<ActivePublicSpaceAffectation[]> {
    const matches = [...this.rows.values()].filter((row) =>
      row.restoredAt === null &&
      (!filter.afectacionIds || filter.afectacionIds.includes(row.afectacionId)) &&
      (!filter.espacioId || filter.espacioId === row.espacioId) &&
      (!filter.causaId || filter.causaId === row.causaId) &&
      (!filter.causaTipos || filter.causaTipos.includes(row.causaTipo)));
    matches.forEach((row) => { row.restoredAt = restoredAt; });
    return matches.map(({ afectacionId, espacioId, correlationId }) => ({ afectacionId, espacioId, correlationId }));
  }
}

function capture() {
  const saved: DomainEvent[] = [];
  const outbox = { save: async (event: DomainEvent) => void saved.push(event) };
  const bus = { publish: jest.fn() };
  const affectations = new InMemoryAffectations();
  return { saved, outbox, bus, affectations, publisher: new PublicSpaceAffectedPublisher(outbox, bus, affectations) };
}

const restoredOf = (saved: DomainEvent[]) => saved.filter((event) => event.name === RESTORED);
const idOf = (event: DomainEvent) => (event.payload as { afectacionId: string }).afectacionId;

describe("EspacioPublicoRestaurado", () => {
  it("termina la afectacion con el mismo afectacionId y correlationId, y no se repite", async () => {
    const { publisher, saved, bus } = capture();
    await publisher.publish([{
      afectacionId: "afe-1", space, tipoAfectacion: "ACCESO_RESTRINGIDO", desde: new Date("2026-11-20T15:00:00.000Z"),
      hastaEstimada: new Date("2026-11-20T21:00:00.000Z"), causaId: "alerta-1", causaTipo: "EVENTO_CLIMATICO"
    }]);

    const restoredAt = new Date("2026-11-20T20:00:00.000Z");
    expect(await publisher.restore({ afectacionIds: ["afe-1"] }, restoredAt)).toBe(1);
    expect(await publisher.restore({ afectacionIds: ["afe-1"] }, restoredAt)).toBe(0);

    expect(restoredOf(saved).map((event) => event.payload)).toEqual([{
      afectacionId: "afe-1", espacioId: "space-1", correlationId: "afectacion-afe-1", restauradoAt: "2026-11-20T20:00:00.000Z"
    }]);
    expect(bus.publish).toHaveBeenCalledTimes(2);
  });

  it("sin repositorio de afectaciones no publica restauraciones", async () => {
    const saved: DomainEvent[] = [];
    const publisher = new PublicSpaceAffectedPublisher({ save: async (e: DomainEvent) => void saved.push(e) }, { publish: jest.fn() });

    expect(await publisher.restore({ espacioId: "space-1" })).toBe(0);
    expect(saved).toHaveLength(0);
  });

  it("al rehabilitar un espacio termina solo el cierre manual, no las afectaciones con causa", async () => {
    const events = capture();
    let current: PublicSpace = space;
    const repository = {
      findById: jest.fn(async () => current),
      update: jest.fn(async (_id: string, data: Record<string, unknown>) => {
        current = { ...current, ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) };
        return current;
      })
    };
    const useCase = new UpdatePublicSpaceUseCase(repository as never, events.outbox, events.bus, events.publisher);
    await events.publisher.publish([{
      afectacionId: "afe-reclamo", space, tipoAfectacion: "USO_PARCIAL", desde: new Date(), hastaEstimada: null,
      causaId: "rec-1", causaTipo: "RECLAMO"
    }]);

    await useCase.execute("space-1", { status: "DISABLED" });
    const closed = events.saved.find((event) =>
      event.name === AFFECTED && (event.payload as { tipoAfectacion: string }).tipoAfectacion === "CERRADO")!;
    await useCase.execute("space-1", { status: "ENABLED" });

    expect(restoredOf(events.saved).map(idOf)).toEqual([idOf(closed)]);
    expect(events.affectations.rows.get("afe-reclamo")!.restoredAt).toBeNull();
  });

  describe("cuando el reclamo deja de cortar la calle", () => {
    function build() {
      const events = capture();
      const useCase = new ReceiveGatewayEventUseCase(
        { exists: jest.fn().mockResolvedValue(false), record: jest.fn() },
        {
          upsertActive: jest.fn(), deactivate: jest.fn(), findActiveInBounds: jest.fn(),
          findActiveWithoutCoordinatesWithZone: jest.fn(), findActiveBySource: jest.fn(), findActive: jest.fn()
        },
        { findByEventId: jest.fn(), saveIfNewer: jest.fn() } as never,
        { findById: jest.fn() },
        { findAll: jest.fn().mockResolvedValue([space]) },
        events.publisher
      );
      return { useCase, ...events };
    }

    const created = {
      metadata: { eventId: "evt-1", eventType: "com.citypass.reclamos.ReclamoCreado" },
      data: { reclamoId: "rec-7", afectaCirculacion: true, latitud: -34.6, longitud: -58.399 }
    };

    it("ReclamoActualizado RESUELTO restaura los espacios que habia afectado", async () => {
      const { useCase, saved } = build();
      await useCase.execute(created);

      await useCase.execute({
        metadata: { eventId: "evt-2", eventType: "com.citypass.reclamos.ReclamoActualizado" },
        data: { reclamoId: "rec-7", estadoNuevo: "RESUELTO" }
      });

      expect(restoredOf(saved).map((event) => event.payload)).toEqual([expect.objectContaining({
        afectacionId: stableAffectationId("RECLAMO", "rec-7", "space-1"), espacioId: "space-1"
      })]);
    });

    it("ReclamoReclasificado sin corte de circulacion tambien la restaura", async () => {
      const { useCase, saved } = build();
      await useCase.execute(created);

      await useCase.execute({
        metadata: { eventId: "evt-3", eventType: "com.citypass.reclamos.ReclamoReclasificado" },
        data: { reclamoId: "rec-7", afectaCirculacionAnterior: true, afectaCirculacionNueva: false }
      });

      expect(restoredOf(saved)).toHaveLength(1);
    });

    it("un estado que no cierra el reclamo no restaura nada", async () => {
      const { useCase, saved } = build();
      await useCase.execute(created);

      await useCase.execute({
        metadata: { eventId: "evt-4", eventType: "com.citypass.reclamos.ReclamoActualizado" },
        data: { reclamoId: "rec-7", estadoNuevo: "EN_PROCESO" }
      });

      expect(restoredOf(saved)).toHaveLength(0);
    });
  });

  it("al finalizar la intervencion termina las afectaciones del reclamo", async () => {
    const events = capture();
    await events.publisher.publish([{
      afectacionId: "afe-vial", space, tipoAfectacion: "ACCESO_RESTRINGIDO", desde: new Date(), hastaEstimada: null,
      causaId: "rec-9", causaTipo: "INCIDENTE_VIAL"
    }]);
    const useCase = new FinishInterventionUseCase(
      {
        findActive: jest.fn().mockResolvedValue({
          id: "i1", source: "RECLAMOS", externalId: "rec-9", category: null, latitude: -34.6, longitude: -58.4,
          zone: null, active: true, reportedAt: new Date(), updatedAt: new Date()
        }),
        deactivate: jest.fn()
      },
      events.outbox,
      events.bus,
      events.publisher
    );

    await useCase.execute({ reclamoId: "rec-9", resultado: "RESUELTO" });

    expect(restoredOf(events.saved).map(idOf)).toEqual(["afe-vial"]);
  });
});
