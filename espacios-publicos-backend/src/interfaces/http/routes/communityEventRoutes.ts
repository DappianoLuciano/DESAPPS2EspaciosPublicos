import { Router } from "express";
import { CommunityEventController } from "../controllers/CommunityEventController";
import { asyncHandler } from "../middlewares/asyncHandler";

export function createCommunityEventRoutes(controller: CommunityEventController): Router {
  const router = Router();

  router.post("/", asyncHandler(controller.create));
  router.get("/", asyncHandler(controller.list));

  return router;
}
