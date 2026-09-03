import { Router } from "express";
import { ReservationController } from "../controllers/ReservationController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireRole } from "../middlewares/mockIdentity";

export function createReservationRoutes(controller: ReservationController): Router {
  const router = Router();

  router.post("/", requireRole("citizen"), asyncHandler(controller.create));
  router.get("/", requireRole("municipal_admin"), asyncHandler(controller.list));

  return router;
}
