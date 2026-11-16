import { ReservationLifecyclePublisher } from "../../src/application/events/ReservationLifecyclePublisher";
import { DomainEvent } from "../../src/domain/entities/DomainEvent";

function setup() {
  const outbox: DomainEvent[] = [];
  const bus: DomainEvent[] = [];
  const publisher = new ReservationLifecyclePublisher(
    { save: async (event: DomainEvent) => { outbox.push(event); } },
    { publish: async (event: DomainEvent) => { bus.push(event); } }
  );
  return { publisher, outbox, bus };
}

const data = {
  reservaId: "res-1",
  tipoReserva: "ESPACIO" as const,
  recursoId: "plaza",
  espacioId: "plaza",
  categoria: "PLAZA",
  zona: "Recoleta",
  latitud: -34.59,
  longitud: -58.39,
  inicio: new Date("2026-11-20T18:00:00.000Z"),
  fin: new Date("2026-11-20T20:00:00.000Z"),
  cantidadPersonas: 10,
  cupoMaximo: 100,
  createdAt: new Date("2026-11-12T10:00:00.000Z")
};

describe("ReservationLifecyclePublisher (Analitica)", () => {
  it("publica ReservaCreada con los campos que lee Analitica y la confirma", async () => {
    const { publisher, bus, outbox } = setup();

    await publisher.createdAndConfirmed(data);

    expect(bus.map((event) => event.name)).toEqual([
      "com.citypass.espacios.ReservaCreada",
      "com.citypass.espacios.ReservaActualizada"
    ]);
    expect(outbox).toHaveLength(2);
    expect(bus[0].payload).toMatchObject({
      reservaId: "res-1",
      tipoReserva: "ESPACIO",
      recursoId: "plaza",
      categoria: "PLAZA",
      zona: "Recoleta",
      latitud: -34.59,
      longitud: -58.39,
      fechaHora: "2026-11-20T18:00:00.000Z",
      cantidadPersonas: 10,
      cupoMaximo: 100,
      createdAt: "2026-11-12T10:00:00.000Z",
      correlationId: "res-1"
    });
    expect(bus[1].payload).toMatchObject({ reservaId: "res-1", estadoAnterior: "PENDIENTE", estadoNuevo: "CONFIRMADA" });
  });

  it("publica la cancelacion como ReservaActualizada", async () => {
    const { publisher, bus } = setup();

    await publisher.cancelled("res-1", "Cancelada por el ciudadano");

    expect(bus[0].payload).toMatchObject({ estadoAnterior: "CONFIRMADA", estadoNuevo: "CANCELADA", motivo: "Cancelada por el ciudadano" });
  });

  it("si falla la publicacion no corta la reserva", async () => {
    const publisher = new ReservationLifecyclePublisher(
      { save: async () => { throw new Error("db"); } },
      { publish: async () => undefined }
    );

    await expect(publisher.createdAndConfirmed(data)).resolves.toBeUndefined();
  });

  it("no manda datos personales", async () => {
    const { publisher, bus } = setup();

    await publisher.createdAndConfirmed(data);

    expect(JSON.stringify(bus.map((event) => event.payload))).not.toMatch(/@|requester|citizen/i);
  });
});
