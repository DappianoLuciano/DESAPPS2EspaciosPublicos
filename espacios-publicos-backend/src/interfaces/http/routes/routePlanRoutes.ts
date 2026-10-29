import { Router } from "express";
import { RoutePlanController } from "../controllers/RoutePlanController";
import { asyncHandler } from "../middlewares/asyncHandler";

// Publica, como el detalle del evento: no hay datos personales y la ubicacion del usuario no se guarda.
export function createRoutePlanRoutes(controller: RoutePlanController): Router {
  const router = Router();

  router.get("/:id/route-plan", asyncHandler(controller.get));

  return router;
}
