import { Request, Response, Router } from "express";
import { GetIntegrationOverviewUseCase } from "../../../application/use-cases/GetIntegrationOverviewUseCase";
import { permissions } from "../auth/permissions";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requirePermission } from "../middlewares/mockIdentity";

/** Panel de integraciones del admin (solo lectura). */
export function createIntegrationRoutes(overview: GetIntegrationOverviewUseCase): Router {
  const router = Router();

  router.get(
    "/",
    requirePermission(permissions.VIEW_INTEGRATIONS),
    asyncHandler(async (_request: Request, response: Response) => {
      response.json(await overview.execute());
    })
  );

  return router;
}
