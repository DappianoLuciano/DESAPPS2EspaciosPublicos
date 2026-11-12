import { definitions } from "../../scripts/register-event-types";

describe("registro unificado de contratos EDA", () => {
  it("conserva los ocho contratos, sin duplicar el catalogo climatico", () => {
    expect(definitions.map(item => item.name)).toEqual([
      "CriticidadClimaticaConfirmada", "CriticidadClimaticaFinalizada",
      "EventoComunitarioPublicado", "EventoCancelado", "EspacioEstadoCambiado", "ReservaConfirmada",
      "ActividadCreada", "IntervencionFinalizada"
    ]);
  });

  it("conserva los campos de los cuatro contratos de main", () => {
    const expected: Record<string, string[]> = {
      EventoComunitarioPublicado: ["eventoId", "espacioId", "titulo", "zona", "direccion", "latitud", "longitud", "inicio", "fin", "capacidad", "cupoMaximo", "inscriptos", "estado", "categoria", "correlationId"],
      EventoCancelado: ["eventoId", "espacioId", "motivo", "canceladoEn", "correlationId"],
      EspacioEstadoCambiado: ["espacioId", "estadoNuevo", "zona", "latitud", "longitud", "cambiadoEn"],
      ReservaConfirmada: ["reservaId", "tipoReserva", "recursoId", "espacioId", "cantidadPersonas", "inicio", "fin"],
      ActividadCreada: ["actividadId", "titulo", "estado", "capacidad", "fechaHoraInicio", "fechaHoraFinalizacion", "ubicacion", "direccion", "espacioNombre"],
      IntervencionFinalizada: ["reclamoId", "resultado", "idAuto", "solicitadoAt", "resueltoAt"]
    };
    for (const [name, fields] of Object.entries(expected)) {
      expect(definitions.find(item => item.name === name)?.fields.map(field => field.name)).toEqual(fields);
    }
  });

  it("incluye barrios y temperaturas en el unico contrato de confirmacion", () => {
    const confirmed = definitions.find(item => item.name === "CriticidadClimaticaConfirmada")!;
    expect(confirmed.fields).toContainEqual({ name: "barrios", type: { type: "array", items: "string" }, default: [] });
    for (const name of ["temperaturaMinC", "temperaturaMaxC"]) {
      expect(confirmed.fields).toContainEqual({ name, type: ["null", "double"], default: null });
    }
  });
});
