import { Router } from "express";
import { permissions } from "../auth/permissions";
import { TowInterventionController } from "../controllers/TowInterventionController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requirePermission } from "../middlewares/mockIdentity";
import { auditAction } from "../middlewares/securityAudit";
import { allowBodyFields } from "../middlewares/validateRequest";

const mobilityEventFields = [
  "reclamoId",
  "correlationId",
  "latitud",
  "longitud",
  "direccion",
  "barrio",
  "afectaCiclovia",
  "estacionesAfectadasIds",
  "impactoCirculacion",
  "desvioSugerido",
  "requiereIntervencionInmediata",
  "requiereGrua",
  "evaluadoAt"
] as const;

export function createTowInterventionRoutes(
  controller: TowInterventionController
): Router {
  const router = Router();

  router.get(
    "/",
    requirePermission(permissions.VIEW_TOW_INTERVENTIONS),
    auditAction(permissions.VIEW_TOW_INTERVENTIONS, "tow-intervention"),
    asyncHandler(controller.list)
  );

  router.post(
    "/simulate",
    requirePermission(permissions.SIMULATE_MOBILITY_OBSTRUCTION),
    auditAction(
      permissions.SIMULATE_MOBILITY_OBSTRUCTION,
      "tow-intervention-simulation"
    ),
    allowBodyFields(mobilityEventFields),
    asyncHandler(controller.simulateMobilityEvent)
  );

  router.post(
    "/:id/request",
    requirePermission(permissions.REQUEST_TOW),
    auditAction(permissions.REQUEST_TOW, "tow-intervention"),
    allowBodyFields(["patente"]),
    asyncHandler(controller.requestTow)
  );

  router.post(
    "/:id/complete",
    requirePermission(permissions.COMPLETE_TOW_SERVICE),
    auditAction(permissions.COMPLETE_TOW_SERVICE, "tow-intervention"),
    allowBodyFields([]),
    asyncHandler(controller.completeTowService)
  );

  return router;
}
