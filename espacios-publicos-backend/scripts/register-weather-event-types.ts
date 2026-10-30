import "dotenv/config";
import { OAuthServiceTokenProvider } from "../src/infrastructure/auth/OAuthServiceTokenProvider";

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
      { name: "barrios", type: { type: "array", items: "string" }, default: [] },
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
  const token = await new OAuthServiceTokenProvider(tokenUrl, clientId, clientSecret).getToken();
  const namespace = process.env.EVENT_NAMESPACE?.trim() || "com.citypass.espacios";
  const listResponse = await fetch(`${gatewayUrl}/event-types`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000)
  });
  if (!listResponse.ok) throw new Error("No se pudo consultar el catalogo EDA.");
  const existingTypes = await listResponse.json() as Array<{ fqn: string; schemaId: number }>;

  for (const definition of definitions) {
    const expectedFqn = namespace + "." + definition.name;
    const configuredFqn = process.env[definition.name.endsWith("Confirmada")
      ? "WEATHER_CONFIRMED_EVENT_FQN" : "WEATHER_FINALIZED_EVENT_FQN"]?.trim();
    if (configuredFqn && configuredFqn !== expectedFqn) {
      throw new Error("El FQN configurado no coincide con el namespace del cliente: " + expectedFqn);
    }
    const existing = existingTypes.find((item) => item.fqn === expectedFqn);
    const response = existing ? new Response("", { status: 409 }) : await fetch(`${gatewayUrl}/event-types`, {
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
      // No asumir compatibilidad por el solo hecho de que exista el nombre.
      const info = await fetch(`${gatewayUrl}/event-types`, {
        headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000)
      });
      if (!info.ok) throw new Error("No se pudo verificar el contrato existente.");
      const items = await info.json() as Array<{ fqn: string; schemaId: number }>;
      const item = items.find((item) => item.fqn === expectedFqn);
      if (!item) throw new Error("El contrato existente no aparece en el gateway: " + expectedFqn);
      const schemaResponse = await fetch(`${gatewayUrl}/schemas/ids/${item.schemaId}`, {
        headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000)
      });
      if (!schemaResponse.ok) throw new Error("No se pudo leer el esquema existente.");
      const schemaBody = await schemaResponse.json() as { schema?: string };
      if (!schemaBody.schema) throw new Error("Respuesta de esquema no reconocida; verificar contrato con EDA.");
      const schema = JSON.parse(schemaBody.schema);
      const dataField = schema.fields?.find((field: { name: string }) => field.name === "data");
      const fields = dataField?.type?.fields || schema.fields;
      if (JSON.stringify(normalize(fields)) !== JSON.stringify(normalize(definition.fields))) {
        if (process.argv.includes("--update-compatible")) {
          const update = await fetch(`${gatewayUrl}/event-types/${encodeURIComponent(expectedFqn)}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(definition), signal: AbortSignal.timeout(20_000)
          });
          const result = await update.text();
          if (!update.ok) throw new Error("EDA no acepto la evolucion: " + update.status + " " + result);
          process.stdout.write(expectedFqn + ": esquema actualizado " + result + "\n");
          continue;
        }
        throw new Error("El esquema registrado difiere del local: " + expectedFqn + ". Coordinar su evolucion con EDA.");
      }
      process.stdout.write(`${expectedFqn}: contrato existente verificado (schemaId ${item.schemaId}).\n`);
      continue;
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

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
