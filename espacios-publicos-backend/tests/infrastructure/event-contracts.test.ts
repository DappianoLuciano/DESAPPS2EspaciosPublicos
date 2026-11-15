import { definitions } from "../../scripts/register-event-types";

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
      "fechaHoraFinalizacion", "ubicacion", "direccion", "espacioNombre", "actorSub", "categoria", "organizadorTipo",
      "masivo", "tipoActividad", "espacioId", "organizadorId", "createdAt"
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
    expect(actividad.fields).toContainEqual({ name: "organizadorTipo", type: "string", doc: "CIUDAD | CIUDADANO" });
  });

  // Contrato Parte 2 de Analitica: los campos nuevos van al final del record, como ["null", tipo] con
  // default null, para que la evolucion sea compatible con lo que ya esta registrado.
  const PARTE_2: Record<string, Array<[string, string]>> = {
    ActividadCreada: [
      ["masivo", "boolean"], ["tipoActividad", "string"], ["espacioId", "string"],
      ["organizadorId", "string"], ["createdAt", "string"]
    ],
    ActividadModificada: [["tipoActividad", "string"]],
    CriticidadClimaticaConfirmada: [["correlationId", "string"], ["occurredAt", "string"], ["descripcion", "string"]]
  };

  it.each(Object.entries(PARTE_2))("%s: los campos nuevos de la Parte 2 son nullable con default null y van al final", (name, added) => {
    const fields = definitions.find(item => item.name === name)!.fields;
    const tail = fields.slice(-added.length);
    expect(tail.map(field => field.name)).toEqual(added.map(([field]) => field));
    for (const [field, type] of added) {
      const definition = tail.find(item => item.name === field)!;
      expect(definition.type).toEqual(["null", type]);
      expect(definition).toHaveProperty("default", null);
    }
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
      { name: "actorSub", type: ["null", "string"], default: null },
      { name: "tipoActividad", type: ["null", "string"], default: null, doc: "CULTURAL | DEPORTIVO | RECREATIVO" }
    ]);
  });

  it("CriticidadClimaticaConfirmada no manda radioAfectacionKm (null significa toda la ciudad)", () => {
    const confirmed = definitions.find(item => item.name === "CriticidadClimaticaConfirmada")!;
    expect(confirmed.fields.map(field => field.name)).not.toContain("radioAfectacionKm");
  });

  it("incluye barrios y temperaturas en el unico contrato de confirmacion", () => {
    const confirmed = definitions.find(item => item.name === "CriticidadClimaticaConfirmada")!;
    expect(confirmed.fields).toContainEqual({ name: "barrios", type: { type: "array", items: "string" }, default: [] });
    for (const name of ["temperaturaMinC", "temperaturaMaxC"]) {
      expect(confirmed.fields).toContainEqual({ name, type: ["null", "double"], default: null });
    }
  });
});
