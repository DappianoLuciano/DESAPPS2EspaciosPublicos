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
  // El ciudadano no inscripto pide que le avisen por mail si el evento sigue, se reprograma o se cancela.
  router.get(
    "/notices/:eventId/watch",
    requirePermission(permissions.REGISTER_TO_EVENT),
    asyncHandler(controller.watchStatus)
  );
  router.post(
    "/notices/:eventId/watch",
    requirePermission(permissions.REGISTER_TO_EVENT),
    auditAction("emergency-impact.watch", "community-event"),
    allowBodyFields([]),
    asyncHandler(controller.watch)
  );
  router.get("/", requirePermission(permissions.VIEW_EMERGENCY_IMPACTS), asyncHandler(controller.list));
  router.post(
    "/:id/reschedule",
    requirePermission(permissions.MANAGE_EMERGENCY_IMPACTS),
    auditAction(permissions.MANAGE_EMERGENCY_IMPACTS, "emergency-impact"),
    allowBodyFields(["startDate", "endDate"]),
    asyncHandler(controller.reschedule)
  );
  router.post(
    "/:id/cancel",
    requirePermission(permissions.MANAGE_EMERGENCY_IMPACTS),
    auditAction(permissions.MANAGE_EMERGENCY_IMPACTS, "emergency-impact"),
    allowBodyFields(["reason"]),
    asyncHandler(controller.cancel)
  );
  // Cierra sin reprogramar lo que quedo "A reprogramar" (el horario ya paso).
  router.post(
    "/:id/dismiss",
    requirePermission(permissions.MANAGE_EMERGENCY_IMPACTS),
    auditAction(permissions.MANAGE_EMERGENCY_IMPACTS, "emergency-impact"),
    allowBodyFields(["reason"]),
    asyncHandler(controller.dismiss)
  );

  return router;
}
