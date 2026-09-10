import { Router } from "express";
import { PublicSpaceController } from "../controllers/PublicSpaceController";
import { permissions } from "../auth/permissions";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requirePermission } from "../middlewares/mockIdentity";
import { auditAction } from "../middlewares/securityAudit";
import { allowBodyFields } from "../middlewares/validateRequest";

const publicSpaceFields = [
  "name",
  "description",
  "address",
  "zone",
  "capacity",
  "status",
  "imageUrl"
] as const;

export function createPublicSpaceRoutes(controller: PublicSpaceController): Router {
  const router = Router();

  router.post(
    "/",
    requirePermission(permissions.CREATE_PUBLIC_SPACE),
    auditAction(permissions.CREATE_PUBLIC_SPACE, "public-space"),
    allowBodyFields(publicSpaceFields),
    asyncHandler(controller.create)
  );
  router.get("/", asyncHandler(controller.list));
  router.put(
    "/:id",
    requirePermission(permissions.UPDATE_PUBLIC_SPACE),
    auditAction(permissions.UPDATE_PUBLIC_SPACE, "public-space"),
    allowBodyFields(publicSpaceFields),
    asyncHandler(controller.update)
  );
  router.delete(
    "/:id",
    requirePermission(permissions.DELETE_PUBLIC_SPACE),
    auditAction(permissions.DELETE_PUBLIC_SPACE, "public-space"),
    asyncHandler(controller.delete)
  );

  return router;
}
