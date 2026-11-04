import { definitions } from "../../scripts/register-event-types";

describe("registro unificado de contratos EDA", () => {
  it("conserva los siete contratos, sin duplicar el catalogo climatico", () => {
    expect(definitions.map(item => item.name)).toEqual([
      "CriticidadClimaticaConfirmada", "CriticidadClimaticaFinalizada",
      "EventoComunitarioPublicado", "ActividadCreada", "EventoCancelado", "EspacioEstadoCambiado", "ReservaConfirmada"
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
      "fechaHoraFinalizacion", "ubicacion", "direccion", "espacioNombre", "actorSub", "categoria"
    ]);
    expect(actividad.fields).toContainEqual({ name: "actorSub", type: ["null", "string"], default: null });
  });

  it("agrega categoria a ActividadCreada como opcional, para ser compatible hacia atras", () => {
    const actividad = definitions.find(item => item.name === "ActividadCreada")!;
    expect(actividad.fields.at(-1)).toEqual({ name: "categoria", type: ["null", "string"], default: null });
  });

  it("incluye barrios y temperaturas en el unico contrato de confirmacion", () => {
    const confirmed = definitions.find(item => item.name === "CriticidadClimaticaConfirmada")!;
    expect(confirmed.fields).toContainEqual({ name: "barrios", type: { type: "array", items: "string" }, default: [] });
    for (const name of ["temperaturaMinC", "temperaturaMaxC"]) {
      expect(confirmed.fields).toContainEqual({ name, type: ["null", "double"], default: null });
    }
  });
});
