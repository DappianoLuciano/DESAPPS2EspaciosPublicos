import "dotenv/config";

interface EventTypeDefinition {
  name: string;
  fields: Array<Record<string, unknown>>;
}

const gatewayUrl = required("EVENT_GATEWAY_API_URL").replace(/\/+$/, "");
const tokenUrl = required("EVENT_AUTH_TOKEN_URL");
const clientId = required("EVENT_CLIENT_ID");
const clientSecret = required("EVENT_CLIENT_SECRET");

const definitions: EventTypeDefinition[] = [
  {
    name: "CriticidadClimaticaConfirmada",
    fields: [
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
      { name: "temperaturaMinC", type: ["null", "double"], default: null },
      { name: "temperaturaMaxC", type: ["null", "double"], default: null },
      { name: "actorSub", type: "string" }
    ]
  },
  {
    name: "CriticidadClimaticaFinalizada",
    fields: [
      { name: "alertaId", type: "string" },
      { name: "finalizadaEn", type: { type: "long", logicalType: "timestamp-millis" } },
      { name: "actorSub", type: "string" }
    ]
  }
];

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
