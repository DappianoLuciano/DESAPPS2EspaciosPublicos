import {
  createIncidenteResueltoEvent,
  INCIDENTE_RESUELTO_EVENT_NAME
} from "../../src/domain/events/IncidenteResueltoEvent";
import { TowIntervention } from "../../src/domain/entities/TowIntervention";

const baseIntervention: TowIntervention = {
  id: "intervencion-1",
  reclamoId: "reclamo-1",
  correlationId: "correlation-1",
  latitud: -34.6037,
  longitud: -58.3816,
  direccion: "Av. Corrientes 1000",
  barrio: "San Nicolas",
  afectaCiclovia: true,
  estacionesAfectadasIds: [10, 11],
  impactoCirculacion: "ALTO",
  desvioSugerido: "Av. Cordoba",
  requiereIntervencionInmediata: true,
  requiereGrua: true,
  patente: "AB123CD",
  status: "COMPLETED",
  evaluadoAt: new Date("2026-11-04T12:00:00.000Z"),
  solicitadoAt: new Date("2026-11-04T12:05:00.000Z"),
  resueltoAt: new Date("2026-11-04T12:20:00.000Z"),
  createdAt: new Date("2026-11-04T12:00:01.000Z"),
  updatedAt: new Date("2026-11-04T12:20:00.000Z")
};

describe("IncidenteResueltoEvent", () => {
  it("prepara el contrato definitivo para un vehiculo retirado por grua", () => {
    const event = createIncidenteResueltoEvent(
      baseIntervention,
      () => "evento-1"
    );

    expect(event).toEqual({
      id: "evento-1",
      name: INCIDENTE_RESUELTO_EVENT_NAME,
      payload: {
        reclamoId: "reclamo-1",
        correlationId: "correlation-1",
        resultado: "RESUELTO",
        idAuto: "AB123CD",
        solicitadoAt: Date.parse("2026-11-04T12:05:00.000Z"),
        resueltoAt: Date.parse("2026-11-04T12:20:00.000Z")
      },
      occurredAt: new Date("2026-11-04T12:20:00.000Z")
    });
  });

  it("prepara la resolucion automatica sin datos de grua", () => {
    const event = createIncidenteResueltoEvent(
      {
        ...baseIntervention,
        requiereGrua: false,
        patente: null,
        solicitadoAt: null
      },
      () => "evento-2"
    );

    expect(event.payload).toMatchObject({
      resultado: "RESUELTO",
      idAuto: null,
      solicitadoAt: null,
      resueltoAt: Date.parse("2026-11-04T12:20:00.000Z")
    });
  });

  it("no prepara el evento para una intervencion pendiente", () => {
    expect(() =>
      createIncidenteResueltoEvent({
        ...baseIntervention,
        status: "TOW_REQUESTED",
        resueltoAt: null
      })
    ).toThrow(
      "La intervencion debe estar completada antes de preparar el evento de resolucion."
    );
  });
});
