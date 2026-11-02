import { AppError } from "../../shared/errors/AppError";

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
    // Inspección de contrato; la firma la verifica el gateway con JWKS.
    let claims: Record<string, unknown>;
    try {
      claims = JSON.parse(Buffer.from(data.access_token.split(".")[1], "base64url").toString("utf8"));
    } catch {
      throw new AppError("El proveedor de identidad no devolvio un JWT utilizable.", 502);
    }
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    const expectedNamespace = process.env.EVENT_NAMESPACE?.trim() || "com.citypass.espacios";
    if (claims.token_use !== "service" || claims.namespace !== expectedNamespace ||
      !audiences.includes("citypass") || typeof claims.exp !== "number" || claims.exp * 1000 <= Date.now()) {
      throw new AppError("El JWT de servicio no cumple el namespace, audiencia, tipo o vigencia esperados para EDA.", 502);
    }

    const expiresIn = Number.isFinite(data.expires_in) ? Number(data.expires_in) : 300;
    this.cachedToken = {
      value: data.access_token,
      expiresAt: Math.min(Date.now() + expiresIn * 1000, claims.exp * 1000)
    };
    return data.access_token;
  }

  invalidate(): void {
    this.cachedToken = undefined;
  }
}
