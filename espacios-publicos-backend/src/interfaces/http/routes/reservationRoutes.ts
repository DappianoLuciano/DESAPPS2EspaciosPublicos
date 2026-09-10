import { Router } from "express";
import { ReservationController } from "../controllers/ReservationController";
import { permissions } from "../auth/permissions";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requirePermission } from "../middlewares/mockIdentity";
import { auditAction } from "../middlewares/securityAudit";
import { allowBodyFields } from "../middlewares/validateRequest";

export function createReservationRoutes(controller: ReservationController): Router {
  const router = Router();

  router.post(
    "/",
    requirePermission(permissions.CREATE_RESERVATION),
    auditAction(permissions.CREATE_RESERVATION, "reservation"),
    allowBodyFields(["publicSpaceId", "estimatedAttendees", "startDate", "endDate"]),
    asyncHandler(controller.create)
  );
  router.get(
    "/",
    requirePermission(permissions.LIST_RESERVATIONS),
    auditAction(permissions.LIST_RESERVATIONS, "reservation"),
    asyncHandler(controller.list)
  );

  return router;
}
