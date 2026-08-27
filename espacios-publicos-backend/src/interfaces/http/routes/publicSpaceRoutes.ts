import { Router } from "express";
import { PublicSpaceController } from "../controllers/PublicSpaceController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireRole } from "../middlewares/mockIdentity";

export function createPublicSpaceRoutes(controller: PublicSpaceController): Router {
  const router = Router();

  router.post("/", requireRole("municipal_admin"), asyncHandler(controller.create));
  router.get("/", asyncHandler(controller.list));
  router.put("/:id", requireRole("municipal_admin"), asyncHandler(controller.update));
  router.delete("/:id", requireRole("municipal_admin"), asyncHandler(controller.delete));

  return router;
}
