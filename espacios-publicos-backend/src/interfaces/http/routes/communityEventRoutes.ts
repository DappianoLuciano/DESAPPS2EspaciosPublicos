import { Router } from "express";
import { CommunityEventController } from "../controllers/CommunityEventController";
import { permissions } from "../auth/permissions";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requirePermission } from "../middlewares/mockIdentity";
import { auditAction } from "../middlewares/securityAudit";
import { allowBodyFields } from "../middlewares/validateRequest";

const communityEventFields = [
  "title",
  "category",
  "tags",
  "description",
  "requirements",
  "publicSpaceId",
  "capacity",
  "requiresRegistration",
  "startDate",
  "endDate",
  "imageUrl"
] as const;

export function createCommunityEventRoutes(controller: CommunityEventController): Router {
  const router = Router();

  router.get(
    "/registrations/me",
    requirePermission(permissions.VIEW_OWN_REGISTRATIONS),
    auditAction(permissions.VIEW_OWN_REGISTRATIONS, "community-event-registration"),
    asyncHandler(controller.listCitizenRegistrations)
  );
  router.delete(
    "/registrations/:registrationId",
    requirePermission(permissions.CANCEL_OWN_REGISTRATION),
    auditAction(permissions.CANCEL_OWN_REGISTRATION, "community-event-registration"),
    asyncHandler(controller.cancelRegistration)
  );
  router.post(
    "/",
    requirePermission(permissions.CREATE_COMMUNITY_EVENT),
    auditAction(permissions.CREATE_COMMUNITY_EVENT, "community-event"),
    allowBodyFields(communityEventFields),
    asyncHandler(controller.create)
  );
  router.get("/", asyncHandler(controller.list));
  router.get("/:id", asyncHandler(controller.getById));
  router.post(
    "/:id/registrations",
    requirePermission(permissions.REGISTER_TO_EVENT),
    auditAction(permissions.REGISTER_TO_EVENT, "community-event-registration"),
    allowBodyFields([]),
    asyncHandler(controller.registerCitizen)
  );
  router.get(
    "/:id/registrations",
    requirePermission(permissions.VIEW_EVENT_REGISTRATIONS),
    auditAction(permissions.VIEW_EVENT_REGISTRATIONS, "community-event-registration"),
    asyncHandler(controller.listRegistrations)
  );

  return router;
}
