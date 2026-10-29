import "dotenv/config";
import { GATEWAY_SUBSCRIPTION_TOPICS } from "../src/application/use-cases/ReceiveGatewayEventUseCase";
import { OAuthServiceTokenProvider, resolveEventAuthTokenUrl } from "../src/infrastructure/auth/OAuthServiceTokenProvider";
import {
  buildCallbackUrl,
  maskCallbackUrl,
  registerSubscriptions
} from "../src/infrastructure/events/registerSubscriptions";

// Da de alta en el Event Gateway las suscripciones de este modulo: el gateway llamara a
//   {PUBLIC_BACKEND_URL}/webhooks/citypass?token={GATEWAY_WEBHOOK_TOKEN}
// cada vez que se publique alguno de los topicos que el webhook sabe procesar.
//
// Uso:  npm run eda:register-subscriptions
// Requiere EVENT_GATEWAY_API_URL, EVENT_CLIENT_ID, EVENT_CLIENT_SECRET, PUBLIC_BACKEND_URL y GATEWAY_WEBHOOK_TOKEN.
// EVENT_AUTH_TOKEN_URL es opcional (por defecto https://api.citypass-login.pp.ua/oauth/token).
// Una suscripcion que ya existe responde 409: se informa "ya existía" y se sigue con la siguiente.
// La salida muestra la URL con el token enmascarado.

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta ${name}.`);
  return value;
}

async function main() {
  const gatewayUrl = required("EVENT_GATEWAY_API_URL");
  const clientId = required("EVENT_CLIENT_ID");
  const clientSecret = required("EVENT_CLIENT_SECRET");
  const webhookToken = required("GATEWAY_WEBHOOK_TOKEN");
  const callbackUrl = buildCallbackUrl(required("PUBLIC_BACKEND_URL"), webhookToken);

  process.stdout.write(`Suscribiendo ${GATEWAY_SUBSCRIPTION_TOPICS.length} topicos a ${maskCallbackUrl(callbackUrl)}\n`);

  await registerSubscriptions({
    gatewayUrl,
    tokenProvider: new OAuthServiceTokenProvider(resolveEventAuthTokenUrl(), clientId, clientSecret),
    topics: GATEWAY_SUBSCRIPTION_TOPICS,
    callbackUrl,
    webhookToken,
    log: (line) => process.stdout.write(`${line}\n`)
  });
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
