import { AppError } from "../../shared/errors/AppError";

export interface AnalyticsDashboard {
  /** Pagina HTML autocontenida (datos e informe de IA incluidos) que el admin ve en un iframe aislado. */
  html: string;
  generatedAt: string | null;
}

/** Tablero de Analitica del modulo, pedido con el token del admin que lo va a ver. */
export interface AnalyticsDashboardSource {
  fetchDashboard(userToken: string): Promise<AnalyticsDashboard>;
}

/**
 * Tablero de Analitica (Grupo 8) embebido en el admin. Es la unica llamada directa a otro modulo: solo trae
 * una vista para mostrar, no datos de negocio. La integracion entre modulos sigue siendo por eventos.
 */
export class GetAnalyticsDashboardUseCase {
  constructor(private readonly source?: AnalyticsDashboardSource) {}

  async execute(userToken: string | null): Promise<AnalyticsDashboard> {
    if (!this.source) {
      throw new AppError("Analítica todavía no está configurada.", 503);
    }

    if (!userToken) {
      throw new AppError("Para ver Analítica hay que iniciar sesión con el login de CityPass.", 401);
    }

    return this.source.fetchDashboard(userToken);
  }
}
