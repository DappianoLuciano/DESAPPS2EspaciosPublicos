import { buildPublicSpaceAffectedPayload, PublicSpaceAffectedPublisher } from "../../src/application/events/publicSpaceAffected";
import { CreatePublicSpaceUseCase } from "../../src/application/use-cases/CreatePublicSpaceUseCase";
import { ReceiveGatewayEventUseCase } from "../../src/application/use-cases/ReceiveGatewayEventUseCase";
import { UpdatePublicSpaceUseCase } from "../../src/application/use-cases/UpdatePublicSpaceUseCase";
import { DomainEvent } from "../../src/domain/entities/DomainEvent";
import { PublicSpace } from "../../src/domain/entities/PublicSpace";
import { ValidationError } from "../../src/shared/errors/ValidationError";

const AFFECTED = "com.citypass.espacios.EspacioPublicoAfectado";

const space: PublicSpace = {
  id: "space-1",
  name: "Plaza Houssay",
  description: "d",
  address: "Av. Córdoba 2100",
  zone: "Recoleta",
  capacity: 6000,
  latitude: -34.5994,
  longitude: -58.3988,
  status: "ENABLED",
  category: "PLAZA",
  createdAt: new Date()
};

function capture() {
  const saved: DomainEvent[] = [];
  const published: DomainEvent[] = [];
  const outbox = { save: async (event: DomainEvent) => void saved.push(event) };
  const bus = { publish: async (event: DomainEvent) => void published.push(event) };
  return { saved, published, outbox, bus, publisher: new PublicSpaceAffectedPublisher(outbox, bus) };
}

describe("EspacioPublicoAfectado", () => {
  it("arma el payload con fechas en milisegundos y null en lo opcional", () => {
    const desde = new Date("2026-11-20T15:00:00.000Z");
    const occurredAt = new Date("2026-11-20T15:00:05.000Z");

    expect(buildPublicSpaceAffectedPayload({
      space: { ...space, category: null, latitude: null, longitude: null },
      tipoAfectacion: "CERRADO",
      desde,
      hastaEstimada: null,
      causaId: null,
      causaTipo: null
    }, "afe-1", occurredAt)).toEqual({
      afectacionId: "afe-1",
      espacioId: "space-1",
      categoria: null,
      latitud: null,
      longitud: null,
      tipoAfectacion: "CERRADO",
      afectacionDesde: desde.getTime(),
      afectacionHastaEstimada: null,
      causaId: null,
      causaTipo: null,
      correlationId: "afectacion-afe-1",
      occurredAt: occurredAt.getTime()
    });
  });

  describe("al cambiar el estado de un espacio", () => {
    function build(current: PublicSpace) {
      const events = capture();
      const update = jest.fn(async (_id: string, data: Record<string, unknown>) => ({
        ...current,
        ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))
      }));
      const useCase = new UpdatePublicSpaceUseCase(
        { findById: jest.fn().mockResolvedValue(current), update } as never,
        events.outbox,
        events.bus,
        events.publisher
      );
      return { useCase, ...events };
    }

    it("al deshabilitarlo publica una afectacion CERRADO sin causa ni fecha de fin", async () => {
      const { useCase, saved, published } = build(space);

      await useCase.execute("space-1", { status: "DISABLED" });

      const affected = saved.filter((event) => event.name === AFFECTED);
      expect(affected).toHaveLength(1);
      expect(published.map((event) => event.id)).toEqual(saved.map((event) => event.id));
      expect(affected[0].payload).toEqual(expect.objectContaining({
        espacioId: "space-1",
        categoria: "PLAZA",
        tipoAfectacion: "CERRADO",
        afectacionHastaEstimada: null,
        causaId: null,
        causaTipo: null
      }));
    });

    it("al volver a habilitarlo no publica afectacion", async () => {
      const { useCase, saved } = build({ ...space, status: "DISABLED" });

      await useCase.execute("space-1", { status: "ENABLED" });

      expect(saved.filter((event) => event.name === AFFECTED)).toHaveLength(0);
    });
  });

  describe("al recibir un reclamo que corta la circulacion", () => {
    const far = { ...space, id: "space-lejos", latitude: -34.7, longitude: -58.5 };
    const noCoordinates = { ...space, id: "space-sin-coordenadas", latitude: null, longitude: null };

    function build() {
      const events = capture();
      const findAll = jest.fn().mockResolvedValue([space, far, noCoordinates]);
      const useCase = new ReceiveGatewayEventUseCase(
        { exists: jest.fn().mockResolvedValue(false), record: jest.fn() },
        {
          upsertActive: jest.fn(),
          deactivate: jest.fn(),
          findActiveInBounds: jest.fn(),
          findActiveWithoutCoordinatesWithZone: jest.fn(),
    findActiveBySource: jest.fn(),
    findActive: jest.fn()
        },
        { findByEventId: jest.fn(), saveIfNewer: jest.fn() } as never,
        { findById: jest.fn() },
        { findAll },
        events.publisher
      );
      return { useCase, findAll, ...events };
    }

    const reclamo = (data: Record<string, unknown>) => ({
      metadata: { eventId: "evt-1", eventType: "com.citypass.reclamos.ReclamoCreado" },
      data: { reclamoId: "rec-7", afectaCirculacion: true, latitud: -34.6, longitud: -58.399, ...data }
    });

    it("marca con USO_PARCIAL solo los espacios habilitados a 1000 m o menos", async () => {
      const { useCase, findAll, saved } = build();

      await useCase.execute(reclamo({}));

      expect(findAll).toHaveBeenCalledWith({ status: "ENABLED" });
      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe(AFFECTED);
      expect(saved[0].payload).toEqual(expect.objectContaining({
        espacioId: "space-1",
        tipoAfectacion: "USO_PARCIAL",
        causaId: "rec-7",
        causaTipo: "RECLAMO",
        afectacionHastaEstimada: null
      }));
    });

    it("no publica nada si el reclamo no afecta la circulacion", async () => {
      const { useCase, saved } = build();

      await useCase.execute(reclamo({ afectaCirculacion: false }));

      expect(saved).toHaveLength(0);
    });

    it("una emergencia ubicada solo por barrio no genera afectaciones", async () => {
      const { useCase, saved, findAll } = build();

      await useCase.execute({
        metadata: { eventId: "evt-2", eventType: "com.citypass.emergencias.EmergenciaCreada" },
        data: { emergenciaId: "em-1", estado: "ABIERTA", ubicacion: { barrio: "Recoleta" } }
      });

      expect(findAll).not.toHaveBeenCalled();
      expect(saved).toHaveLength(0);
    });
  });

  it("rechaza una categoria de espacio desconocida", async () => {
    const useCase = new CreatePublicSpaceUseCase({ create: jest.fn() } as never);

    await expect(useCase.execute({
      name: "Club",
      description: "d",
      address: "Calle 1",
      capacity: 10,
      category: "ESTADIO" as never
    })).rejects.toBeInstanceOf(ValidationError);
  });
});
