import { NextFunction, Request, Response, Router } from "express";
import { UnauthorizedError } from "../../../shared/errors/UnauthorizedError";
import { safeEqual } from "../../../shared/security/safeEqual";
import { GatewayWebhookController } from "../controllers/GatewayWebhookController";
import { asyncHandler } from "../middlewares/asyncHandler";

// El dispatcher del gateway no firma ni manda JWT: el unico control es el token de la query.
function requireWebhookToken(request: Request, _response: Response, next: NextFunction): void {
  if (!safeEqual(request.query.token, process.env.GATEWAY_WEBHOOK_TOKEN)) {
    throw new UnauthorizedError("Token de webhook invalido.");
  }

  next();
}

export function createWebhookRoutes(controller: GatewayWebhookController): Router {
  const router = Router();

  router.post("/citypass", requireWebhookToken, asyncHandler(controller.receive));

  return router;
}
