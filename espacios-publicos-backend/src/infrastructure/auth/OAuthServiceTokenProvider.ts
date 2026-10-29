import { AppError } from "../../shared/errors/AppError";

// Emisor OAuth del login federado (Grupo 2). Se puede pisar con EVENT_AUTH_TOKEN_URL.
export const DEFAULT_EVENT_AUTH_TOKEN_URL = "https://api.citypass-login.pp.ua/oauth/token";

export function resolveEventAuthTokenUrl(env: Record<string, string | undefined> = process.env): string {
  return env.EVENT_AUTH_TOKEN_URL?.trim() || DEFAULT_EVENT_AUTH_TOKEN_URL;
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
}

export class OAuthServiceTokenProvider {
  private cachedToken?: { value: string; expiresAt: number };

  constructor(
    private readonly tokenUrl: string,
    private readonly clientId: string,
    private readonly clientSecret: string
  ) {}

  async getToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 30_000) {
      return this.cachedToken.value;
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    let response: Response;

    try {
      response = await fetch(this.tokenUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json"
        },
        body: new URLSearchParams({ grant_type: "client_credentials" }),
        signal: AbortSignal.timeout(10_000)
      });
    } catch {
      throw new AppError("No se pudo conectar con el servicio de identidad de CityPass+.", 502);
    }

    if (!response.ok) {
      throw new AppError(`El servicio de identidad rechazo las credenciales (${response.status}).`, 502);
    }

    const data = (await response.json()) as TokenResponse;
    if (!data.access_token) {
      throw new AppError("El servicio de identidad no devolvio un token de servicio.", 502);
    }

    const expiresIn = Number.isFinite(data.expires_in) ? Number(data.expires_in) : 300;
    this.cachedToken = {
      value: data.access_token,
      expiresAt: Date.now() + expiresIn * 1000
    };
    return data.access_token;
  }
}
