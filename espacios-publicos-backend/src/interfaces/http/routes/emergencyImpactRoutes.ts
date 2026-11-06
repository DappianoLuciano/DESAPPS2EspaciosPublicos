import { Router } from "express";
import { permissions } from "../auth/permissions";
import { EmergencyImpactController } from "../controllers/EmergencyImpactController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requirePermission } from "../middlewares/mockIdentity";
import { auditAction } from "../middlewares/securityAudit";
import { allowBodyFields } from "../middlewares/validateRequest";

export function createNearbySpacesRoutes(controller: EmergencyImpactController): Router {
  const router = Router();

  router.get(
    "/cercanos",
    requirePermission(permissions.VIEW_EMERGENCY_IMPACTS),
    auditAction(permissions.VIEW_EMERGENCY_IMPACTS, "public-space"),
    asyncHandler(controller.nearby)
  );

  return router;
}

export function createEmergencyImpactRoutes(controller: EmergencyImpactController): Router {
  const router = Router();

  // Publica, como el catalogo de eventos: los ciudadanos ven el aviso. No trae datos personales.
  router.get("/notices", asyncHandler(controller.notices));
  router.get("/", requirePermission(permissions.VIEW_EMERGENCY_IMPACTS), asyncHandler(controller.list));
  router.post(
    "/:id/reschedule",
    requirePermission(permissions.MANAGE_EMERGENCY_IMPACTS),
    auditAction(permissions.MANAGE_EMERGENCY_IMPACTS, "emergency-impact"),
    allowBodyFields(["startDate", "endDate"]),
    asyncHandler(controller.reschedule)
  );

  return router;
}
