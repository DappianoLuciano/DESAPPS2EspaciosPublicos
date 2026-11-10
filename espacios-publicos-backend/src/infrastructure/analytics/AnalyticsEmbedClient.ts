import { AnalyticsDashboard, AnalyticsDashboardSource } from "../../application/use-cases/GetAnalyticsDashboardUseCase";
import { AppError } from "../../shared/errors/AppError";
import { logger } from "../../shared/logging/logger";

const REQUEST_TIMEOUT_MS = 10_000;
/** Identificador de nuestro modulo en Analitica. */
export const ANALYTICS_MODULE = "espacios";

type FetchFn = typeof fetch;

interface TokenProvider {
  getToken(): Promise<string>;
}

/**
 * Pide el tablero a Analitica servidor a servidor: GET {ANALITICA_URL}/embed/espacios con nuestro token de
 * servicio (client credentials) y el token del admin. Analitica todavia no cerro el contrato, asi que el token
 * del usuario va con los dos nombres de header propuestos y se acepta tanto JSON { html, generado_en } como
 * el HTML directo.
 */
export class AnalyticsEmbedClient implements AnalyticsDashboardSource {
  constructor(
    private readonly baseUrl: string,
    private readonly serviceTokens: TokenProvider,
    private readonly fetchFn: FetchFn = (input, init) => fetch(input, init)
  ) {}

  async fetchDashboard(userToken: string): Promise<AnalyticsDashboard> {
    let response: Response;

    try {
      const serviceToken = await this.serviceTokens.getToken();
      response = await this.fetchFn(`${this.baseUrl.replace(/\/+$/, "")}/embed/${ANALYTICS_MODULE}`, {
        headers: {
          Authorization: `Bearer ${serviceToken}`,
          "X-User-Token": userToken,
          "X-Usuario-Token": userToken,
          Accept: "application/json, text/html"
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
    } catch (error) {
      logger.warn({ err: error }, "Analitica no respondio");
      throw new AppError("Analítica no está disponible en este momento.", 502);
    }

    if (response.status === 401 || response.status === 403) {
      logger.warn({ status: response.status }, "Analitica rechazo el pedido del tablero");
      throw new AppError("Analítica no autorizó el acceso a este tablero.", 403);
    }

    if (!response.ok) {
      logger.warn({ status: response.status }, "Analitica respondio con error");
      throw new AppError("Analítica no está disponible en este momento.", 502);
    }

    const body = await response.text();
    const isJson = (response.headers.get("content-type") ?? "").includes("json") || body.trimStart().startsWith("{");

    if (!isJson) {
      return { html: body, generatedAt: null };
    }

    let parsed: { html?: unknown; generado_en?: unknown; generatedAt?: unknown };

    try {
      parsed = JSON.parse(body);
    } catch {
      throw new AppError("Analítica devolvió una respuesta que no se puede mostrar.", 502);
    }

    if (typeof parsed.html !== "string" || !parsed.html.trim()) {
      throw new AppError("Analítica devolvió una respuesta que no se puede mostrar.", 502);
    }

    const generatedAt = parsed.generado_en ?? parsed.generatedAt;
    return { html: parsed.html, generatedAt: typeof generatedAt === "string" ? generatedAt : null };
  }
}
