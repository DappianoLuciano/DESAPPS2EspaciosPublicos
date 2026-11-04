import { EmergencyResolved, parseEmergencyCreated, parseEmergencyResolved } from "../../src/application/events/emergencyEvents";
import { FindNearbyBookingsUseCase, nearbySpaces } from "../../src/application/use-cases/FindNearbyBookingsUseCase";
import { HandleEmergencyCreatedUseCase } from "../../src/application/use-cases/HandleEmergencyCreatedUseCase";
import { HandleEmergencyResolvedUseCase } from "../../src/application/use-cases/HandleEmergencyResolvedUseCase";
import { CommunityEvent } from "../../src/domain/entities/CommunityEvent";
import { DomainEvent } from "../../src/domain/entities/DomainEvent";
import {
  CreateEmergencyImpactData,
  CreateSpaceProblemData,
  EmergencyCaseRecord,
  EmergencyImpactRecord
} from "../../src/domain/entities/EmergencyImpact";
import { PublicSpace } from "../../src/domain/entities/PublicSpace";
import { Reservation } from "../../src/domain/entities/Reservation";
import { ImpactRelease } from "../../src/domain/repositories/EmergencyImpactRepository";

const EMERGENCY = "EMG-20261008-0091";
const NOW = Date.now();
const hours = (value: number) => new Date(NOW + value * 3_600_000);

function space(overrides: Partial<PublicSpace> = {}): PublicSpace {
  return {
    id: "plaza",
    name: "Plaza",
    description: "",
    address: "",
    zone: "San Nicolás",
    capacity: 100,
    latitude: -34.6037,
    longitude: -58.3816,
    status: "ENABLED",
    createdAt: new Date(),
    ...overrides
  };
}

function reservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: "res-1",
    publicSpaceId: "plaza",
    requesterName: "Organizadora",
    requesterEmail: "org@test.com",
    estimatedAttendees: 10,
    startDate: hours(1),
    endDate: hours(3),
    status: "CONFIRMED",
    createdAt: new Date(),
    ...overrides
  };
}

/** Repositorio en memoria con las mismas restricciones unicas que la base. */
function createStore() {
  const cases = new Map<string, EmergencyCaseRecord>();
  const impacts = new Map<string, EmergencyImpactRecord>();
  const problems = new Set<string>();
  const outbox: DomainEvent[] = [];

  return {
    cases,
    impacts,
    outbox,
    findCase: async (id: string) => cases.get(id) ?? null,
    saveCase: async (emergency: EmergencyCaseRecord) => {
      if (!cases.has(emergency.emergenciaId)) cases.set(emergency.emergenciaId, emergency);
    },
    resolveCase: async (emergency: EmergencyCaseRecord) => {
      cases.set(emergency.emergenciaId, emergency);
    },
    createImpact: async (data: CreateEmergencyImpactData, event: DomainEvent) => {
      const id = `${data.emergenciaId}/${data.bookingType}/${data.bookingId}`;
      if (impacts.has(id)) return false;
      impacts.set(id, {
        ...data,
        id,
        status: "SUSPENDIDA",
        rescheduledBy: null,
        rescheduledAt: null,
        releasedAt: null,
        createdAt: new Date()
      });
      outbox.push(event);
      return true;
    },
    findUnreleased: async (id: string) =>
      [...impacts.values()].filter((impact) => impact.emergenciaId === id && !impact.releasedAt),
    releaseImpacts: async (releases: ImpactRelease[], releasedAt: Date, event: DomainEvent) => {
      for (const { id, status } of releases) {
        impacts.set(id, { ...impacts.get(id)!, status, releasedAt });
      }
      outbox.push(event);
    },
    createProblem: async (data: CreateSpaceProblemData, event: DomainEvent) => {
      if (problems.has(data.emergenciaId)) return false;
      problems.add(data.emergenciaId);
      outbox.push(event);
      return true;
    }
  };
}

function setup(
  spaces: PublicSpace[] = [space()],
  reservations: Reservation[] = [reservation()],
  events: CommunityEvent[] = []
) {
  const store = createStore();
  const eventBus = { publish: jest.fn().mockResolvedValue(undefined) };
  const emailSender = { send: jest.fn().mockResolvedValue(undefined) };
  const spaceRepository = { findAll: jest.fn().mockResolvedValue(spaces) };
  const attendees = { findByEventId: jest.fn().mockResolvedValue([]) };
  const finder = new FindNearbyBookingsUseCase(
    spaceRepository,
    { findOverlapping: jest.fn().mockResolvedValue(reservations) },
    { findOverlapping: jest.fn().mockResolvedValue(events) }
  );

  return {
    store,
    eventBus,
    emailSender,
    attendees,
    created: new HandleEmergencyCreatedUseCase(store, finder, eventBus, emailSender, attendees),
    resolved: new HandleEmergencyResolvedUseCase(store, spaceRepository, eventBus, emailSender, attendees)
  };
}

const created = {
  emergenciaId: EMERGENCY,
  occurredAt: new Date(NOW),
  latitude: -34.6037,
  longitude: -58.3816,
  zone: null
};

function resolvedWith(causes: string[]): EmergencyResolved {
  return { emergenciaId: EMERGENCY, causes, problemType: null, latitude: null, longitude: null, zone: null };
}

function published(eventBus: { publish: jest.Mock }): string[] {
  return eventBus.publish.mock.calls.map(([event]) => (event as DomainEvent).name.split(".").pop() as string);
}

describe("CU-01: al crearse la emergencia (A10)", () => {
  it("suspende la reserva cercana, avisa al organizador y publica ReservaAfectada", async () => {
    const { created: handler, eventBus, emailSender, store } = setup();

    await expect(handler.execute(created)).resolves.toBe(true);

    const [event] = store.outbox;
    expect(published(eventBus)).toEqual(["ReservaAfectada"]);
    expect(event.payload).toMatchObject({
      correlationId: EMERGENCY,
      emergenciaId: EMERGENCY,
      espacioId: "plaza",
      reservaId: "res-1",
      tipoReserva: "ESPACIO",
      accion: "SUSPENDIDA"
    });
    expect(JSON.stringify(event.payload)).not.toContain("org@test.com");
    expect(emailSender.send).toHaveBeenCalledTimes(1);
  });

  it("no publica nada si no hay reservas cercanas", async () => {
    const { created: handler, eventBus, emailSender } = setup([space()], []);

    await expect(handler.execute(created)).resolves.toBe(true);
    expect(eventBus.publish).not.toHaveBeenCalled();
    expect(emailSender.send).not.toHaveBeenCalled();
  });

  it("no repite la accion si llega dos veces con otro eventId (RNI-04)", async () => {
    const { created: handler, eventBus, emailSender } = setup();

    await handler.execute(created);
    await handler.execute(created);

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(emailSender.send).toHaveBeenCalledTimes(1);
  });

  it("no suspende si la resolucion llego antes", async () => {
    const { created: createdHandler, resolved, eventBus } = setup();

    await resolved.execute(resolvedWith([]));
    await createdHandler.execute(created);

    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it("un mail que falla no frena el flujo", async () => {
    const { created: handler, emailSender, eventBus } = setup();
    emailSender.send.mockRejectedValue(new Error("smtp caido"));

    await expect(handler.execute(created)).resolves.toBe(true);
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });

  it("sin ninguna ubicacion no procesa", async () => {
    const { created: handler } = setup();

    await expect(handler.execute({ ...created, latitude: null, longitude: null })).resolves.toBe(false);
  });
});

describe("CU-01: al resolverse la emergencia", () => {
  it("libera el espacio aunque la causa no sea el espacio publico (A10)", async () => {
    const { created: createdHandler, resolved, eventBus, store } = setup();

    await createdHandler.execute(created);
    await resolved.execute(resolvedWith(["VIA"]));

    expect(published(eventBus)).toEqual(["ReservaAfectada", "EspacioLiberado"]);
    expect(store.outbox[1].payload).toMatchObject({
      espacioId: "plaza",
      correlationId: EMERGENCY,
      reservasConfirmadas: ["res-1"],
      reservasReprogramadas: []
    });
  });

  it("no hace nada con causa VIA y sin reservas afectadas", async () => {
    const { resolved, eventBus } = setup();

    await resolved.execute(resolvedWith(["VIA"]));

    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it("registra la problematica solo con ESPACIO_PUBLICO (A6)", async () => {
    const { created: createdHandler, resolved, eventBus, store } = setup([space()], []);

    await createdHandler.execute(created);
    await resolved.execute(resolvedWith(["ESPACIO_PUBLICO"]));

    expect(published(eventBus)).toEqual(["ProblematicaRegistrada"]);
    expect(store.outbox[0].payload).toMatchObject({ espacioId: "plaza", tipo: "SIN_CLASIFICAR", latitud: -34.6037 });
  });

  it("no libera ni registra dos veces (RNI-04)", async () => {
    const { created: createdHandler, resolved, eventBus } = setup();

    await createdHandler.execute(created);
    await resolved.execute(resolvedWith(["ESPACIO_PUBLICO"]));
    await resolved.execute(resolvedWith(["ESPACIO_PUBLICO"]));

    expect(published(eventBus)).toEqual(["ReservaAfectada", "EspacioLiberado", "ProblematicaRegistrada"]);
  });

  it("la actualizacion transitoria sin causas no impide registrar la problematica despues", async () => {
    const { resolved, eventBus } = setup([space()], []);

    await resolved.execute(resolvedWith([]));
    await resolved.execute(resolvedWith(["ESPACIO_PUBLICO"]));

    expect(published(eventBus)).toEqual(["ProblematicaRegistrada"]);
  });

  it("una falsa alarma confirma la reserva y una EmergenciaCreada tardia no la vuelve a suspender", async () => {
    const { created: createdHandler, resolved, eventBus, store } = setup();

    await createdHandler.execute(created);
    await resolved.execute(resolvedWith([]));
    await createdHandler.execute(created);

    expect(published(eventBus)).toEqual(["ReservaAfectada", "EspacioLiberado"]);
    expect([...store.impacts.values()][0].status).toBe("CONFIRMADA");
  });

  it("deja para reprogramar la reserva cuyo horario ya paso", async () => {
    const past = reservation({ startDate: hours(-3), endDate: hours(-1) });
    const { created: createdHandler, resolved, store } = setup([space()], [past]);

    await createdHandler.execute(created);
    await resolved.execute(resolvedWith([]));

    expect([...store.impacts.values()][0].status).toBe("A_REPROGRAMAR");
    expect(store.outbox[1].payload).toMatchObject({ reservasConfirmadas: [], reservasReprogramadas: [] });
  });
});

describe("CU-01: avisos a inscriptos", () => {
  const event = { id: "evento-1", organizerName: "Cultura", startDate: hours(1), endDate: hours(3) } as CommunityEvent;
  const inscriptos = [
    { citizenName: "Ana <b>", citizenEmail: "ana@test.com" },
    { citizenName: "Beto", citizenEmail: "beto@test.com" }
  ];

  it("avisa a cada inscripto por separado al suspender y al liberar", async () => {
    const { created: createdHandler, resolved, emailSender, attendees } = setup([space()], [], [event]);
    attendees.findByEventId.mockResolvedValue(inscriptos);

    await createdHandler.execute(created);
    await resolved.execute(resolvedWith([]));

    const recipients = emailSender.send.mock.calls.map(([to]) => to);
    expect(recipients).toEqual(["ana@test.com", "beto@test.com", "ana@test.com", "beto@test.com"]);
    expect(emailSender.send.mock.calls[0][2]).not.toContain("<b>");
  });

  it("no busca inscriptos para una reserva de espacio", async () => {
    const { created: createdHandler, attendees } = setup();

    await createdHandler.execute(created);

    expect(attendees.findByEventId).not.toHaveBeenCalled();
  });

  it("si falla un mail sigue con los demas y no frena el flujo", async () => {
    const { created: createdHandler, emailSender, attendees, eventBus } = setup([space()], [], [event]);
    attendees.findByEventId.mockResolvedValue(inscriptos);
    emailSender.send.mockRejectedValueOnce(new Error("smtp"));

    await expect(createdHandler.execute(created)).resolves.toBe(true);

    expect(emailSender.send).toHaveBeenCalledTimes(2);
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });

  it("si falla la consulta de inscriptos no frena el flujo", async () => {
    const { created: createdHandler, attendees, eventBus } = setup([space()], [], [event]);
    attendees.findByEventId.mockRejectedValue(new Error("base"));

    await expect(createdHandler.execute(created)).resolves.toBe(true);
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });
});

describe("espacios cercanos", () => {
  it("con coordenadas respeta el radio y ordena por distancia", () => {
    const near = space({ id: "cerca" });
    const far = space({ id: "lejos", latitude: -34.7 });

    expect(nearbySpaces([far, near], created).map((item) => item.space.id)).toEqual(["cerca"]);
  });

  it("sin coordenadas compara el barrio sin tildes ni mayusculas", () => {
    const items = nearbySpaces([space()], { latitude: null, longitude: null, zone: "san nicolas" });

    expect(items).toHaveLength(1);
    expect(items[0].distanceMeters).toBeNull();
  });

  it("sin barrio no ubica nada", () => {
    expect(nearbySpaces([space()], { latitude: null, longitude: null, zone: null })).toEqual([]);
  });
});

describe("contratos de entrada", () => {
  it("lee ubicacion {lat, lng} del CU-01", () => {
    expect(parseEmergencyCreated({ emergenciaId: EMERGENCY, ubicacion: { lat: -34.6, lng: -58.3 } }))
      .toMatchObject({ latitude: -34.6, longitude: -58.3, zone: null });
  });

  it("lee latitud y longitud sueltas", () => {
    expect(parseEmergencyCreated({ emergenciaId: EMERGENCY, latitud: -34.6, longitud: -58.3 }))
      .toMatchObject({ latitude: -34.6, longitude: -58.3 });
  });

  it("lee el barrio del contrato actual de Emergencias", () => {
    expect(parseEmergencyCreated({ emergenciaId: 91, ubicacion: { barrio: "Retiro" } }))
      .toMatchObject({ emergenciaId: "91", latitude: null, zone: "Retiro" });
  });

  it("lee las causas relacionadas", () => {
    expect(parseEmergencyResolved({ emergenciaId: EMERGENCY, causasRelacionadas: ["VIA", 1] })?.causes).toEqual(["VIA"]);
  });

  it("descarta un evento sin emergenciaId", () => {
    expect(parseEmergencyCreated({})).toBeNull();
    expect(parseEmergencyResolved({})).toBeNull();
  });
});
