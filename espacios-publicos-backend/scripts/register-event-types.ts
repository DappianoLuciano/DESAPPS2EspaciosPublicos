import "dotenv/config";
import { OAuthServiceTokenProvider, resolveEventAuthTokenUrl } from "../src/infrastructure/auth/OAuthServiceTokenProvider";

// Registra en el Event Gateway los contratos que publica este modulo: los de clima y los
// de eventos comunitarios, espacios y reservas (CU-INT-01). Son records Avro; los campos
// opcionales son uniones ["null", tipo] con default null.
//
// Uso:  npm run eda:register-events
// Requiere EVENT_GATEWAY_API_URL, EVENT_CLIENT_ID y EVENT_CLIENT_SECRET. EVENT_AUTH_TOKEN_URL es opcional
// (por defecto https://api.citypass-login.pp.ua/oauth/token).
// Consulta y verifica los contratos existentes; solo los actualiza con --update-compatible.
// --weather-only permite operar solo sobre los dos contratos climaticos.

interface EventTypeDefinition {
  type: "record";
  name: string;
  namespace: string;
  doc?: string;
  fields: Array<Record<string, unknown>>;
}

const NAMESPACE = process.env.EVENT_NAMESPACE?.trim() || process.env.EVENT_TYPE_NAMESPACE?.trim() || "com.citypass.espacios";

const nullable = (type: string) => ["null", type];

function record(name: string, doc: string, fields: Array<Record<string, unknown>>): EventTypeDefinition {
  return { type: "record", name, namespace: NAMESPACE, doc, fields };
}

const weatherDefinitions: EventTypeDefinition[] = [
  record("CriticidadClimaticaConfirmada", "Una alerta climatica fue confirmada por un administrador.", [
    { name: "alertaId", type: "string" },
    {
      name: "nivelCriticidad",
      type: { type: "enum", name: "NivelCriticidad", symbols: ["BAJA", "MEDIA", "ALTA", "CRITICA"] }
    },
    {
      name: "fenomeno",
      type: {
        type: "enum",
        name: "FenomenoClimatico",
        symbols: ["TORMENTA_FUERTE", "LLUVIA_INTENSA", "VIENTO_FUERTE", "OLA_DE_CALOR", "OLA_DE_FRIO", "GRANIZO", "TORMENTA_ELECTRICA", "HURACAN", "NIEVE"]
      }
    },
    { name: "ubicaciones", type: { type: "array", items: { type: "record", name: "UbicacionClimatica", fields: [
      { name: "latitud", type: "double" }, { name: "longitud", type: "double" }
    ] } } },
    { name: "barrios", type: { type: "array", items: "string" }, default: [] },
    { name: "vigenciaDesde", type: { type: "long", logicalType: "timestamp-millis" } },
    { name: "vigenciaHasta", type: { type: "long", logicalType: "timestamp-millis" } },
    { name: "temperaturaMinC", type: nullable("double"), default: null },
    { name: "temperaturaMaxC", type: nullable("double"), default: null },
    { name: "actorSub", type: "string" }
  ]),
  record("CriticidadClimaticaFinalizada", "Una alerta climatica confirmada termino.", [
    { name: "alertaId", type: "string" },
    { name: "finalizadaEn", type: { type: "long", logicalType: "timestamp-millis" } },
    { name: "actorSub", type: "string" }
  ])
];

const spacesDefinitions: EventTypeDefinition[] = [
  record("EventoComunitarioPublicado", "Se publico un evento comunitario en un espacio publico.", [
    { name: "eventoId", type: "string" },
    { name: "espacioId", type: "string" },
    { name: "titulo", type: "string" },
    { name: "zona", type: nullable("string"), default: null },
    { name: "direccion", type: nullable("string"), default: null },
    { name: "latitud", type: nullable("double"), default: null },
    { name: "longitud", type: nullable("double"), default: null },
    { name: "inicio", type: "string", doc: "ISO 8601" },
    { name: "fin", type: "string", doc: "ISO 8601" },
    { name: "capacidad", type: "int" },
    { name: "cupoMaximo", type: "int", doc: "Mismo valor que capacidad." },
    { name: "inscriptos", type: "int" },
    { name: "estado", type: "string", doc: "ACTIVE | ACTIVE_FULL | CANCELLED" },
    { name: "categoria", type: "string" },
    { name: "correlationId", type: "string", doc: "evento-<eventoId>" }
  ]),
  record("ActividadCreada", "E1 squad 3: se creo una actividad (evento comunitario) en un espacio publico.", [
    // Opcional: el contrato ya estaba registrado sin este campo y un campo obligatorio sin default
    // no es una evolucion compatible. El codigo lo manda siempre.
    { name: "correlationId", type: nullable("string"), default: null, doc: "act-<actividadId>" },
    { name: "actividadId", type: "string" },
    { name: "titulo", type: "string" },
    { name: "estado", type: "string", doc: "Siempre PROGRAMADA" },
    { name: "capacidad", type: "int" },
    { name: "fechaHoraInicio", type: { type: "long", logicalType: "timestamp-millis" } },
    { name: "fechaHoraFinalizacion", type: { type: "long", logicalType: "timestamp-millis" } },
    { name: "ubicacion", type: { type: "record", name: "Ubicacion", fields: [
      { name: "lat", type: "double" }, { name: "lng", type: "double" }
    ] } },
    { name: "direccion", type: "string" },
    { name: "espacioNombre", type: "string" },
    { name: "actorSub", type: nullable("string"), default: null },
    { name: "categoria", type: nullable("string"), default: null }
  ]),
  record("ActividadModificada", "Cambio el estado de una actividad (evento comunitario).", [
    { name: "correlationId", type: "string", doc: "act-<actividadId>" },
    { name: "actividadId", type: "string" },
    { name: "estadoAnterior", type: "string" },
    { name: "estadoNuevo", type: "string", doc: "PROGRAMADA | SUSPENDIDA | CANCELADA" },
    { name: "motivo", type: nullable("string"), default: null },
    { name: "causaId", type: nullable("string"), default: null },
    { name: "causaTipo", type: nullable("string"), default: null, doc: "EVENTO_CLIMATICO | RECLAMO | INCIDENTE_VIAL" },
    { name: "modificadaEn", type: { type: "long", logicalType: "timestamp-millis" } },
    { name: "actorSub", type: nullable("string"), default: null }
  ]),
  record("EventoCancelado", "Un administrador cancelo un evento comunitario.", [
    { name: "eventoId", type: "string" },
    { name: "espacioId", type: "string" },
    { name: "motivo", type: nullable("string"), default: null },
    { name: "canceladoEn", type: "string", doc: "ISO 8601" },
    { name: "correlationId", type: "string" }
  ]),
  record("EspacioEstadoCambiado", "Un espacio publico se habilito o deshabilito.", [
    { name: "espacioId", type: "string" },
    { name: "estadoNuevo", type: "string", doc: "ENABLED | DISABLED" },
    { name: "zona", type: nullable("string"), default: null },
    { name: "latitud", type: nullable("double"), default: null },
    { name: "longitud", type: nullable("double"), default: null },
    { name: "cambiadoEn", type: "string", doc: "ISO 8601" }
  ]),
  record("ReservaConfirmada", "Se confirmo la reserva de un espacio o la inscripcion a un evento.", [
    { name: "reservaId", type: "string" },
    { name: "tipoReserva", type: "string", doc: "EVENTO | ESPACIO" },
    { name: "recursoId", type: "string", doc: "eventoId o espacioId segun tipoReserva" },
    { name: "espacioId", type: "string" },
    { name: "cantidadPersonas", type: "int" },
    { name: "inicio", type: "string", doc: "ISO 8601" },
    { name: "fin", type: "string", doc: "ISO 8601" }
  ]),
  record("ReservaAfectada", "CU-01: una reserva o evento cercano fue afectado por una emergencia.", [
    { name: "correlationId", type: "string", doc: "emergenciaId" },
    { name: "emergenciaId", type: "string" },
    { name: "espacioId", type: "string" },
    { name: "reservaId", type: "string" },
    { name: "tipoReserva", type: "string", doc: "EVENTO | ESPACIO" },
    { name: "horario", type: { type: "record", name: "HorarioReserva", fields: [
      { name: "inicio", type: "string", doc: "ISO 8601" },
      { name: "fin", type: "string", doc: "ISO 8601" }
    ] } },
    { name: "accion", type: "string", doc: "SUSPENDIDA | REPROGRAMADA" },
    { name: "afectadaEn", type: "string", doc: "ISO 8601" }
  ]),
  record("EspacioLiberado", "CU-01: el espacio se libero al resolverse la emergencia.", [
    { name: "correlationId", type: "string", doc: "emergenciaId" },
    { name: "emergenciaId", type: "string" },
    { name: "espacioId", type: "string" },
    { name: "reservasConfirmadas", type: { type: "array", items: "string" } },
    { name: "reservasReprogramadas", type: { type: "array", items: "string" } },
    { name: "liberadoEn", type: "string", doc: "ISO 8601" }
  ]),
  record("ProblematicaRegistrada", "CU-01: se registro una problematica del espacio publico.", [
    { name: "correlationId", type: "string", doc: "emergenciaId" },
    { name: "emergenciaId", type: "string" },
    { name: "problematicaId", type: "string" },
    { name: "espacioId", type: nullable("string"), default: null },
    { name: "tipo", type: "string" },
    { name: "latitud", type: nullable("double"), default: null },
    { name: "longitud", type: nullable("double"), default: null },
    { name: "registradaEn", type: "string", doc: "ISO 8601" }
  ])
];

export const definitions: EventTypeDefinition[] = [...weatherDefinitions, ...spacesDefinitions];

async function main() {
  const gatewayUrl = required("EVENT_GATEWAY_API_URL").replace(/\/+$/, "");
  const token = await new OAuthServiceTokenProvider(
    resolveEventAuthTokenUrl(), required("EVENT_CLIENT_ID"), required("EVENT_CLIENT_SECRET")
  ).getToken();
  if (process.env.EVENT_TYPE_NAMESPACE?.trim() && process.env.EVENT_TYPE_NAMESPACE.trim() !== NAMESPACE) {
    throw new Error("EVENT_TYPE_NAMESPACE y EVENT_NAMESPACE deben coincidir con el namespace del JWT.");
  }
  const listResponse = await fetch(`${gatewayUrl}/event-types`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000)
  });
  if (!listResponse.ok) throw new Error("No se pudo consultar el catalogo EDA.");
  const existingTypes = await listResponse.json() as Array<{ fqn: string; schemaId: number }>;
  const selected = process.argv.includes("--weather-only") ? weatherDefinitions : definitions;
  const configuredNames: Record<string, string> = {
    CriticidadClimaticaConfirmada: "WEATHER_CONFIRMED_EVENT_FQN",
    CriticidadClimaticaFinalizada: "WEATHER_FINALIZED_EVENT_FQN",
    EventoComunitarioPublicado: "COMMUNITY_EVENT_PUBLISHED_EVENT_FQN",
    ActividadCreada: "ACTIVITY_CREATED_EVENT_FQN",
    ActividadModificada: "ACTIVITY_MODIFIED_EVENT_FQN",
    EventoCancelado: "COMMUNITY_EVENT_CANCELLED_EVENT_FQN",
    EspacioEstadoCambiado: "PUBLIC_SPACE_STATUS_CHANGED_EVENT_FQN",
    ReservaConfirmada: "RESERVATION_CONFIRMED_EVENT_FQN",
    ReservaAfectada: "RESERVATION_AFFECTED_EVENT_FQN",
    EspacioLiberado: "SPACE_RELEASED_EVENT_FQN",
    ProblematicaRegistrada: "PROBLEM_REGISTERED_EVENT_FQN"
  };

  for (const definition of selected) {
    const expectedFqn = `${NAMESPACE}.${definition.name}`;
    const configuredFqn = process.env[configuredNames[definition.name]]?.trim();
    if (configuredFqn && configuredFqn !== expectedFqn) {
      throw new Error("El FQN configurado no coincide con el contrato: " + expectedFqn);
    }
    const existing = existingTypes.find(item => item.fqn === expectedFqn);
    if (existing) {
      const schemaResponse = await fetch(`${gatewayUrl}/schemas/ids/${existing.schemaId}`, {
        headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000)
      });
      if (!schemaResponse.ok) throw new Error("No se pudo leer el esquema existente: " + expectedFqn);
      const schemaBody = await schemaResponse.json() as { schema?: string };
      if (!schemaBody.schema) throw new Error("Respuesta de esquema no reconocida: " + expectedFqn);
      const schema = JSON.parse(schemaBody.schema);
      const dataField = schema.fields?.find((field: { name: string }) => field.name === "data");
      const fields = dataField?.type?.fields || schema.fields;
      if (JSON.stringify(normalize(fields)) !== JSON.stringify(normalize(definition.fields))) {
        if (!process.argv.includes("--update-compatible")) {
          throw new Error("El esquema registrado difiere del local: " + expectedFqn + ". Coordinar su evolucion con EDA.");
        }
        const update = await fetch(`${gatewayUrl}/event-types/${encodeURIComponent(expectedFqn)}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(definition), signal: AbortSignal.timeout(20_000)
        });
        const result = await update.text();
        if (!update.ok) throw new Error("EDA no acepto la evolucion: " + update.status + " " + result);
        process.stdout.write(expectedFqn + ": esquema actualizado " + result + "\n");
      } else {
        process.stdout.write(`${expectedFqn}: contrato existente verificado (schemaId ${existing.schemaId}).\n`);
      }
      continue;
    }
    const response = await fetch(`${gatewayUrl}/event-types`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(definition),
      signal: AbortSignal.timeout(20_000)
    });

    if (response.status === 409) {
      throw new Error(`${expectedFqn}: registrado concurrentemente; volver a ejecutar para verificarlo.`);
    }

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`${definition.name}: ${response.status} ${body}`);
    }
    const registered = JSON.parse(body) as { fqn?: string; schemaId?: number };
    if (registered.fqn !== expectedFqn) throw new Error("EDA registro un FQN inesperado.");
    process.stdout.write(`${registered.fqn}: registrado (schemaId ${registered.schemaId}).\n`);
  }
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value).filter(([key]) => !["doc", "namespace", "aliases"].includes(key))
      .sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => [key, normalize(val)])
  );
  return value;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta ${name}.`);
  return value;
}

if (require.main === module) void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
