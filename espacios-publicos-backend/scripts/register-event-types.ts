import "dotenv/config";

// Registra en el Event Gateway los contratos que publica este modulo: los de clima y los
// de eventos comunitarios, espacios y reservas (CU-INT-01). Son records Avro; los campos
// opcionales son uniones ["null", tipo] con default null.
//
// Uso:  npm run eda:register-events
// Requiere EVENT_GATEWAY_API_URL, EVENT_AUTH_TOKEN_URL, EVENT_CLIENT_ID y EVENT_CLIENT_SECRET.
// Un contrato ya registrado responde 409 y se deja como esta: este script no lo actualiza.

interface EventTypeDefinition {
  type: "record";
  name: string;
  namespace: string;
  doc?: string;
  fields: Array<Record<string, unknown>>;
}

const NAMESPACE = process.env.EVENT_TYPE_NAMESPACE?.trim() || "com.citypass.espacios";

const gatewayUrl = required("EVENT_GATEWAY_API_URL").replace(/\/+$/, "");
const tokenUrl = required("EVENT_AUTH_TOKEN_URL");
const clientId = required("EVENT_CLIENT_ID");
const clientSecret = required("EVENT_CLIENT_SECRET");

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
  ])
];

const definitions: EventTypeDefinition[] = [...weatherDefinitions, ...spacesDefinitions];

async function main() {
  const token = await getToken();

  for (const definition of definitions) {
    const response = await fetch(`${gatewayUrl}/event-types`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(definition)
    });

    if (response.status === 409) {
      process.stdout.write(`${definition.name}: ya estaba registrado.\n`);
      continue;
    }

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`${definition.name}: ${response.status} ${body}`);
    }
    process.stdout.write(`${definition.name}: registrado ${body}\n`);
  }
}

async function getToken(): Promise<string> {
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({ grant_type: "client_credentials" })
  });
  const body = (await response.json()) as { access_token?: string; error_description?: string };
  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description || `No se pudo obtener el token (${response.status}).`);
  }
  return body.access_token;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta ${name}.`);
  return value;
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
