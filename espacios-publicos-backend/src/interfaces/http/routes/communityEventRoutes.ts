import { Router } from "express";
import { CommunityEventController } from "../controllers/CommunityEventController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireRole } from "../middlewares/mockIdentity";

export function createCommunityEventRoutes(controller: CommunityEventController): Router {
  const router = Router();

  router.get("/registrations/me", requireRole("citizen"), asyncHandler(controller.listCitizenRegistrations));
  router.delete("/registrations/:registrationId", requireRole("citizen"), asyncHandler(controller.cancelRegistration));
  router.post("/", requireRole("municipal_admin"), asyncHandler(controller.create));
  router.get("/", asyncHandler(controller.list));
  router.get("/:id", asyncHandler(controller.getById));
  router.post("/:id/registrations", requireRole("citizen"), asyncHandler(controller.registerCitizen));
  router.get("/:id/registrations", requireRole("municipal_admin"), asyncHandler(controller.listRegistrations));

  return router;
}
