export interface EventTokenSource {
  getToken(): Promise<string>;
}

export const WEBHOOK_PATH = "/webhooks/citypass";

/** URL a la que el gateway entrega los eventos: {PUBLIC_BACKEND_URL}/webhooks/citypass?token={token}. */
export function buildCallbackUrl(publicBackendUrl: string, webhookToken: string): string {
  const base = publicBackendUrl.trim().replace(/\/+$/, "");

  try {
    new URL(base);
  } catch {
    throw new Error("PUBLIC_BACKEND_URL no es una URL valida.");
  }

  return `${base}${WEBHOOK_PATH}?token=${encodeURIComponent(webhookToken)}`;
}

/** La misma URL con el token enmascarado, para mostrar en pantalla. */
export function maskCallbackUrl(callbackUrl: string): string {
  return callbackUrl.replace(/([?&]token=)[^&#]*/, "$1***");
}

export type SubscriptionOutcome = "registrada" | "ya existia";

export interface RegisterSubscriptionsOptions {
  gatewayUrl: string;
  tokenProvider: EventTokenSource;
  topics: readonly string[];
  callbackUrl: string;
  webhookToken: string;
  fetchFn?: typeof fetch;
  /** Recibe una linea de salida por topico (ya sin el token). */
  log?: (line: string) => void;
}

/**
 * Da de alta una suscripcion por topico: POST {gateway}/subscriptions {topic, callbackUrl}.
 * Un 409 significa que ya existia y se sigue con el resto. Cualquier otro error corta el proceso.
 */
export async function registerSubscriptions(options: RegisterSubscriptionsOptions): Promise<Record<string, SubscriptionOutcome>> {
  const fetchFn = options.fetchFn ?? ((input, init) => fetch(input, init));
  const log = options.log ?? (() => undefined);
  const url = `${options.gatewayUrl.replace(/\/+$/, "")}/subscriptions`;
  const maskedCallback = maskCallbackUrl(options.callbackUrl);
  const token = await options.tokenProvider.getToken();
  const results: Record<string, SubscriptionOutcome> = {};

  for (const topic of options.topics) {
    const response = await fetchFn(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({ topic, callbackUrl: options.callbackUrl })
    });

    if (response.status === 409) {
      results[topic] = "ya existia";
      log(`${topic}: ya existía (${maskedCallback})`);
      continue;
    }

    if (!response.ok) {
      const detail = redact((await response.text()).slice(0, 300), options.webhookToken);
      throw new Error(`${topic}: ${response.status} ${detail}`.trim());
    }

    results[topic] = "registrada";
    log(`${topic}: registrada (${maskedCallback})`);
  }

  return results;
}

// Si el gateway repite la callbackUrl en el error, no se deja pasar el token del webhook.
function redact(text: string, webhookToken: string): string {
  return [webhookToken, encodeURIComponent(webhookToken)]
    .filter(Boolean)
    .reduce((safe, secret) => safe.split(secret).join("***"), text);
}
