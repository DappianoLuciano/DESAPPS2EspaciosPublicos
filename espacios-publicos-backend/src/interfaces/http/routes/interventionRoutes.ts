import { Router } from "express";
import { permissions } from "../auth/permissions";
import { InterventionController } from "../controllers/InterventionController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requirePermission } from "../middlewares/mockIdentity";
import { auditAction } from "../middlewares/securityAudit";
import { allowBodyFields } from "../middlewares/validateRequest";

/** CU-INT-01: intervenciones en la calle pedidas por reclamos que cortan la circulacion. */
export function createInterventionRoutes(controller: InterventionController): Router {
  const router = Router();

  router.get("/", requirePermission(permissions.MANAGE_INTERVENTIONS), asyncHandler(controller.list));
  router.post(
    "/:reclamoId/finish",
    requirePermission(permissions.MANAGE_INTERVENTIONS),
    auditAction(permissions.MANAGE_INTERVENTIONS, "intervention"),
    allowBodyFields(["resultado", "idAuto"]),
    asyncHandler(controller.finish)
  );

  return router;
}
