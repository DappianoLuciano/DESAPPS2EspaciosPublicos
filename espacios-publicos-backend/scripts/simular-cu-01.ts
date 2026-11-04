import { randomUUID } from "crypto";

// Prueba local del CU-01: manda al webhook del backend local los eventos que publicaria Emergencias.
// No usa el gateway ni llama a otros modulos.
//
// Uso:  BACKEND_URL=http://localhost:3000 GATEWAY_WEBHOOK_TOKEN=... npm run cu01:simular -- \
//         --lat -34.6037 --lng -58.3816 --causas ESPACIO_PUBLICO --espera 5

function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

async function send(url: string, eventType: string, data: Record<string, unknown>): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-Proto": "https" },
    body: JSON.stringify({ metadata: { eventId: randomUUID(), eventType }, data })
  });

  process.stdout.write(`${eventType}: ${response.status}\n`);

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

async function main() {
  const backend = (process.env.BACKEND_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");
  const token = process.env.GATEWAY_WEBHOOK_TOKEN?.trim();

  if (!token) {
    throw new Error("Falta GATEWAY_WEBHOOK_TOKEN.");
  }

  const url = `${backend}/webhooks/citypass?token=${encodeURIComponent(token)}`;
  const emergenciaId = option("emergencia", `EMG-LOCAL-${Date.now()}`);
  const ubicacion = { lat: Number(option("lat", "-34.6037")), lng: Number(option("lng", "-58.3816")) };
  const causas = option("causas", "").split(",").filter(Boolean);

  await send(url, "com.citypass.emergencias.EmergenciaCreada", {
    emergenciaId,
    estado: "CREADA",
    ubicacion,
    createdAt: new Date().toISOString()
  });
  await new Promise((resolve) => setTimeout(resolve, Number(option("espera", "5")) * 1000));
  await send(url, "com.citypass.emergencias.EmergenciaResuelta", {
    emergenciaId,
    resultado: "ATENDIDA",
    ubicacion,
    causasRelacionadas: causas
  });
  process.stdout.write(`Listo: ${emergenciaId}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
