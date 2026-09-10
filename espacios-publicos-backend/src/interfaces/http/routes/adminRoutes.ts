import { Router } from "express";
import { AdminController } from "../controllers/AdminController";
import { permissions } from "../auth/permissions";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requirePermission } from "../middlewares/mockIdentity";
import { auditAction } from "../middlewares/securityAudit";
import { allowBodyFields } from "../middlewares/validateRequest";

export function createAdminRoutes(controller: AdminController): Router {
  const router = Router();

  router.get(
    "/profile",
    requirePermission(permissions.VIEW_ADMIN_PROFILE),
    auditAction(permissions.VIEW_ADMIN_PROFILE, "admin-profile"),
    asyncHandler(controller.getProfile)
  );
  router.put(
    "/profile",
    requirePermission(permissions.UPDATE_ADMIN_PROFILE),
    auditAction(permissions.UPDATE_ADMIN_PROFILE, "admin-profile"),
    allowBodyFields(["name", "email", "phone", "department"]),
    asyncHandler(controller.updateProfile)
  );

  return router;
}
