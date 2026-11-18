import { definitions } from "../../scripts/register-event-types";
import {
  buildActivityCreatedFromReservation,
  buildActivityCreatedPayload
} from "../../src/application/use-cases/CreateCommunityEventUseCase";
import { avroErrors } from "../helpers/avroValidate";

describe("payloads de ActividadCreada contra el schema v3 registrado", () => {
  // La definicion local es la v3 registrada (schemaId 91); este PR no la cambia.
  const v3 = definitions.find(item => item.name === "ActividadCreada")!;
  const space = {
    id: "space-1", name: "Plaza Houssay", description: "", address: "Av. Córdoba 2100", capacity: 6000,
    latitude: -34.5994, longitude: -58.3988, status: "ENABLED" as const, createdAt: new Date()
  };
  const start = new Date("2026-11-20T15:00:00.000Z");
  const end = new Date("2026-11-20T18:00:00.000Z");
  const reservation = {
    id: "res-1", publicSpaceId: "space-1", requesterName: "Ana Perez", requesterEmail: "ana@test.com",
    estimatedAttendees: 80, startDate: start, endDate: end, status: "CONFIRMED" as const, createdAt: new Date()
  };

  it("la reserva de un espacio valida contra la v3, con y sin actorSub", () => {
    expect(avroErrors(v3, buildActivityCreatedFromReservation(reservation, space, "sub-ciudadano"))).toEqual([]);
    expect(avroErrors(v3, buildActivityCreatedFromReservation(reservation, space, null))).toEqual([]);
  });

  it("el evento comunitario sigue validando contra la v3", () => {
    const communityEvent = {
      id: "event-1", title: "Festival", category: "Música", tags: [], description: "", requirements: [],
      publicSpaceId: "space-1", organizerName: "Comuna", capacity: 5000, requiresRegistration: false,
      startDate: start, endDate: end, status: "ACTIVE" as const, createdAt: new Date()
    };
    expect(avroErrors(v3, buildActivityCreatedPayload(communityEvent, space, "sub-admin"))).toEqual([]);
  });

  it("el validador es estricto: rechaza campos extra, tipos incorrectos y faltantes", () => {
    const payload = buildActivityCreatedFromReservation(reservation, space, "sub-ciudadano");
    expect(avroErrors(v3, { ...payload, masivo: true })).toEqual(["$.masivo: campo no declarado"]);
    expect(avroErrors(v3, { ...payload, fechaHoraInicio: start.toISOString() })).toHaveLength(1);
    const { organizadorTipo: _omitted, ...withoutOrganizer } = payload;
    expect(avroErrors(v3, withoutOrganizer)).toEqual(["$.organizadorTipo: falta el campo obligatorio"]);
  });
});

describe("registro unificado de contratos EDA", () => {
  it("conserva los contratos, sin duplicar el catalogo climatico", () => {
    expect(definitions.map(item => item.name)).toEqual([
      "CriticidadClimaticaConfirmada", "CriticidadClimaticaFinalizada",
      "EventoComunitarioPublicado", "ActividadCreada", "ActividadModificada", "EventoCancelado",
      "EspacioEstadoCambiado", "EspacioPublicoAfectado", "EspacioPublicoRestaurado", "ReservaConfirmada",
      "ReservaCreada", "ReservaActualizada",
      "ReservaAfectada", "EspacioLiberado", "ProblematicaRegistrada", "IntervencionFinalizada"
    ]);
  });

  it("registra EspacioPublicoAfectado con el contrato pedido por Analitica", () => {
    const afectado = definitions.find(item => item.name === "EspacioPublicoAfectado")!;
    expect(afectado.namespace).toBe("com.citypass.espacios");
    expect(afectado.fields.map(field => field.name)).toEqual([
      "afectacionId", "espacioId", "categoria", "latitud", "longitud", "tipoAfectacion", "afectacionDesde",
      "afectacionHastaEstimada", "causaId", "causaTipo", "correlationId", "occurredAt"
    ]);
    // v2: Analitica pidio las fechas como texto ISO-8601.
    expect(afectado.fields).toContainEqual(expect.objectContaining({ name: "afectacionDesde", type: "string" }));
    expect(afectado.fields).toContainEqual(expect.objectContaining({
      name: "afectacionHastaEstimada", type: ["null", "string"], default: null
    }));
    expect(afectado.fields).toContainEqual(expect.objectContaining({ name: "occurredAt", type: "string" }));
  });

  it("registra EspacioPublicoRestaurado con los campos pedidos por Analitica", () => {
    const restaurado = definitions.find(item => item.name === "EspacioPublicoRestaurado")!;
    expect(restaurado.fields.map(field => [field.name, field.type])).toEqual([
      ["afectacionId", "string"], ["espacioId", "string"], ["correlationId", "string"], ["restauradoAt", "string"]
    ]);
  });

  it("conserva los campos de los cuatro contratos de main", () => {
    const expected: Record<string, string[]> = {
      EventoComunitarioPublicado: ["eventoId", "espacioId", "titulo", "zona", "direccion", "latitud", "longitud", "inicio", "fin", "capacidad", "cupoMaximo", "inscriptos", "estado", "categoria", "correlationId"],
      EventoCancelado: ["eventoId", "espacioId", "motivo", "canceladoEn", "correlationId"],
      EspacioEstadoCambiado: ["espacioId", "estadoNuevo", "zona", "latitud", "longitud", "cambiadoEn"],
      ReservaConfirmada: ["reservaId", "tipoReserva", "recursoId", "espacioId", "cantidadPersonas", "inicio", "fin"]
    };
    for (const [name, fields] of Object.entries(expected)) {
      expect(definitions.find(item => item.name === name)?.fields.map(field => field.name)).toEqual(fields);
    }
  });

  it("registra ActividadCreada (E1 del squad 3) con el contrato acordado", () => {
    const actividad = definitions.find(item => item.name === "ActividadCreada")!;
    expect(actividad.fields.map(field => field.name)).toEqual([
      "correlationId", "actividadId", "titulo", "estado", "capacidad", "fechaHoraInicio",
      "fechaHoraFinalizacion", "ubicacion", "direccion", "espacioNombre", "actorSub", "categoria", "organizadorTipo"
    ]);
    expect(actividad.fields).toContainEqual({ name: "actorSub", type: ["null", "string"], default: null });
  });

  it("agrega correlationId a ActividadCreada como opcional, para ser compatible con el contrato registrado", () => {
    const actividad = definitions.find(item => item.name === "ActividadCreada")!;
    expect(actividad.fields[0]).toEqual({ name: "correlationId", type: ["null", "string"], default: null, doc: "act-<actividadId>" });
  });

  it("agrega categoria a ActividadCreada como opcional, para ser compatible hacia atras", () => {
    const actividad = definitions.find(item => item.name === "ActividadCreada")!;
    expect(actividad.fields).toContainEqual({ name: "categoria", type: ["null", "string"], default: null });
  });

  it("ActividadCreada v3 exige organizadorTipo, igual que el contrato registrado en EDA", () => {
    const actividad = definitions.find(item => item.name === "ActividadCreada")!;
    expect(actividad.fields.at(-1)).toEqual({ name: "organizadorTipo", type: "string", doc: "CIUDAD | CIUDADANO" });
  });

  it("registra ActividadModificada con el contrato exacto pedido por Analitica", () => {
    const actividad = definitions.find(item => item.name === "ActividadModificada")!;
    expect(actividad.namespace).toBe("com.citypass.espacios");
    expect(actividad.fields).toEqual([
      { name: "correlationId", type: "string", doc: "act-<actividadId>" },
      { name: "actividadId", type: "string" },
      { name: "estadoAnterior", type: "string" },
      { name: "estadoNuevo", type: "string", doc: "PROGRAMADA | SUSPENDIDA | CANCELADA" },
      { name: "motivo", type: ["null", "string"], default: null },
      { name: "causaId", type: ["null", "string"], default: null },
      { name: "causaTipo", type: ["null", "string"], default: null, doc: "EVENTO_CLIMATICO | RECLAMO | INCIDENTE_VIAL" },
      { name: "modificadaEn", type: { type: "long", logicalType: "timestamp-millis" } },
      { name: "actorSub", type: ["null", "string"], default: null }
    ]);
  });

  it("incluye barrios y temperaturas en el unico contrato de confirmacion", () => {
    const confirmed = definitions.find(item => item.name === "CriticidadClimaticaConfirmada")!;
    expect(confirmed.fields).toContainEqual({ name: "barrios", type: { type: "array", items: "string" }, default: [] });
    for (const name of ["temperaturaMinC", "temperaturaMaxC"]) {
      expect(confirmed.fields).toContainEqual({ name, type: ["null", "double"], default: null });
    }
  });
});
