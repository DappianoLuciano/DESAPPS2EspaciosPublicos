import { Router } from "express";
import { permissions } from "../auth/permissions";
import { WeatherAlertController } from "../controllers/WeatherAlertController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { auditAction } from "../middlewares/securityAudit";
import { requirePermission } from "../middlewares/mockIdentity";
import { allowBodyFields } from "../middlewares/validateRequest";

export function createWeatherAlertRoutes(controller: WeatherAlertController): Router {
  const router = Router();
  router.get(
    "/locations",
    requirePermission(permissions.VIEW_WEATHER_ALERTS),
    asyncHandler(controller.locations)
  );
  router.post(
    "/manual",
    requirePermission(permissions.CREATE_MANUAL_WEATHER_ALERT),
    auditAction(permissions.CREATE_MANUAL_WEATHER_ALERT, "weather-alert"),
    allowBodyFields(["fenomeno", "nivelCriticidad", "ubicacionesIds", "vigenciaDesde", "vigenciaHasta", "motivo", "fuente", "rafagaMaxKmh", "precipitacionAcumuladaMm", "temperaturaMinC", "temperaturaMaxC"]),
    asyncHandler(controller.createManual)
  );

  router.get(
    "/",
    requirePermission(permissions.VIEW_WEATHER_ALERTS),
    auditAction(permissions.VIEW_WEATHER_ALERTS, "weather-alert"),
    asyncHandler(controller.list)
  );
  router.post(
    "/check",
    requirePermission(permissions.CHECK_WEATHER),
    auditAction(permissions.CHECK_WEATHER, "weather-alert"),
    allowBodyFields([]),
    asyncHandler(controller.checkNow)
  );
  router.get(
    "/:id",
    requirePermission(permissions.VIEW_WEATHER_ALERTS),
    auditAction(permissions.VIEW_WEATHER_ALERTS, "weather-alert"),
    asyncHandler(controller.getById)
  );
  router.post(
    "/:id/confirm",
    requirePermission(permissions.CONFIRM_WEATHER_ALERT),
    auditAction(permissions.CONFIRM_WEATHER_ALERT, "weather-alert"),
    allowBodyFields(["nivelCriticidad", "vigenciaHasta"]),
    asyncHandler(controller.confirm)
  );
  router.post(
    "/:id/dismiss",
    requirePermission(permissions.DISMISS_WEATHER_ALERT),
    auditAction(permissions.DISMISS_WEATHER_ALERT, "weather-alert"),
    allowBodyFields(["motivo"]),
    asyncHandler(controller.dismiss)
  );
  router.post(
    "/:id/finalize",
    requirePermission(permissions.FINALIZE_WEATHER_ALERT),
    auditAction(permissions.FINALIZE_WEATHER_ALERT, "weather-alert"),
    allowBodyFields([]),
    asyncHandler(controller.finalize)
  );

  return router;
}
