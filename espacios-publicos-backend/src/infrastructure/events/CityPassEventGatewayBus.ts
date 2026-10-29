import { DomainEvent } from "../../domain/entities/DomainEvent";
import { EventBus } from "../../domain/services/EventBus";
import { AppError } from "../../shared/errors/AppError";
import { OAuthServiceTokenProvider } from "../auth/OAuthServiceTokenProvider";

export class CityPassEventGatewayBus implements EventBus {
  constructor(
    private readonly gatewayApiUrl: string,
    private readonly tokenProvider: OAuthServiceTokenProvider
  ) {}

  async publish(event: DomainEvent): Promise<void> {
    const token = await this.tokenProvider.getToken();
    const baseUrl = this.gatewayApiUrl.replace(/\/+$/, "");
    const url = `${baseUrl}/event-types/${encodeURIComponent(event.name)}/events`;
    let response: Response;

    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(event.payload),
        signal: AbortSignal.timeout(15_000)
      });
    } catch {
      throw new AppError("No se pudo conectar con el Event Gateway de CityPass+.", 502);
    }

    if (!response.ok) {
      const detail = await response.text();
      const safeDetail = detail.slice(0, 500);
      throw new AppError(
        `El Event Gateway rechazo ${event.name} (${response.status})${safeDetail ? `: ${safeDetail}` : "."}`,
        502
      );
    }
  }
}
