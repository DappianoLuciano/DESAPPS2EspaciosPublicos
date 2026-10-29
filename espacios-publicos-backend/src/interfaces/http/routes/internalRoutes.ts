import { Router } from "express";
import { InternalWeatherController } from "../controllers/InternalWeatherController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireCronSecret } from "../middlewares/requireCronSecret";

export function createInternalRoutes(controller: InternalWeatherController): Router {
  const router = Router();
  router.post("/weather-cycle", requireCronSecret, asyncHandler(controller.runCycle));
  return router;
}
