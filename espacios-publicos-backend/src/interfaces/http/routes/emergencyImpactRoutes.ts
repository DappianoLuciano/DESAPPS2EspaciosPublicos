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

  router.get("/", requirePermission(permissions.VIEW_EMERGENCY_IMPACTS), asyncHandler(controller.list));
  router.post(
    "/:id/reschedule",
    requirePermission(permissions.MANAGE_EMERGENCY_IMPACTS),
    auditAction(permissions.MANAGE_EMERGENCY_IMPACTS, "emergency-impact"),
    allowBodyFields(["startDate", "endDate"]),
    asyncHandler(controller.reschedule)
  );
  router.patch(
    "/problems/:id/derive",
    requirePermission(permissions.MANAGE_EMERGENCY_IMPACTS),
    auditAction(permissions.MANAGE_EMERGENCY_IMPACTS, "space-problem"),
    allowBodyFields(["derivedTo"]),
    asyncHandler(controller.derive)
  );

  return router;
}
