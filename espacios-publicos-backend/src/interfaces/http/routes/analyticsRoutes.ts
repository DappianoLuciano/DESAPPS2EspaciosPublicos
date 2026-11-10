import { Request, Response, Router } from "express";
import { GetAnalyticsDashboardUseCase } from "../../../application/use-cases/GetAnalyticsDashboardUseCase";
import { permissions } from "../auth/permissions";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requirePermission } from "../middlewares/mockIdentity";

function bearerToken(request: Request): string | null {
  const header = request.headers.authorization;
  return header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() || null : null;
}

/** Tablero de Analitica del modulo, solo para el admin. */
export function createAnalyticsRoutes(dashboard: GetAnalyticsDashboardUseCase): Router {
  const router = Router();

  router.get(
    "/",
    requirePermission(permissions.VIEW_ANALYTICS),
    asyncHandler(async (request: Request, response: Response) => {
      const result = await dashboard.execute(bearerToken(request));
      // Tiene datos que solo puede ver un admin: que nadie lo guarde.
      response.set("Cache-Control", "no-store");
      response.json(result);
    })
  );

  return router;
}
