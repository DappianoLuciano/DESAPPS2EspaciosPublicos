import { EventBus } from "../../domain/services/EventBus";
import { AppError } from "../../shared/errors/AppError";
import { OAuthServiceTokenProvider } from "../auth/OAuthServiceTokenProvider";
import { CityPassEventGatewayBus } from "./CityPassEventGatewayBus";
import { ConsoleEventBus } from "./ConsoleEventBus";

export function createEventBus(): EventBus {
  const driver = process.env.EVENT_BUS_DRIVER?.trim().toLowerCase() || "console";

  if (driver === "console") {
    return new ConsoleEventBus();
  }

  if (driver !== "citypass") {
    throw new AppError(`EVENT_BUS_DRIVER desconocido: ${driver}.`, 500);
  }

  const gatewayUrl = requiredEnv("EVENT_GATEWAY_API_URL");
  const tokenUrl = requiredEnv("EVENT_AUTH_TOKEN_URL");
  const clientId = requiredEnv("EVENT_CLIENT_ID");
  const clientSecret = requiredEnv("EVENT_CLIENT_SECRET");
  const tokenProvider = new OAuthServiceTokenProvider(tokenUrl, clientId, clientSecret);

  return new CityPassEventGatewayBus(gatewayUrl, tokenProvider);
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new AppError(`Falta configurar ${name} para publicar en CityPass+.`, 500);
  }
  return value;
}
