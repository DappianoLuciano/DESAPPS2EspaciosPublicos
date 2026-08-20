import { Router } from "express";
import { PublicSpaceController } from "../controllers/PublicSpaceController";
import { asyncHandler } from "../middlewares/asyncHandler";

export function createPublicSpaceRoutes(controller: PublicSpaceController): Router {
  const router = Router();

  router.post("/", asyncHandler(controller.create));
  router.get("/", asyncHandler(controller.list));

  return router;
}
