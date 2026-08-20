import { Router } from "express";
import { ReservationController } from "../controllers/ReservationController";
import { asyncHandler } from "../middlewares/asyncHandler";

export function createReservationRoutes(controller: ReservationController): Router {
  const router = Router();

  router.post("/", asyncHandler(controller.create));
  router.get("/", asyncHandler(controller.list));

  return router;
}
