import { Router } from "express";
import { AdminController } from "../controllers/AdminController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireRole } from "../middlewares/mockIdentity";

export function createAdminRoutes(controller: AdminController): Router {
  const router = Router();

  router.get("/profile", requireRole("municipal_admin"), asyncHandler(controller.getProfile));
  router.put("/profile", requireRole("municipal_admin"), asyncHandler(controller.updateProfile));

  return router;
}
