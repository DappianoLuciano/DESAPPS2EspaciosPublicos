import { NextFunction, Request, Response } from "express";
import { AppError } from "../../../shared/errors/AppError";
import { UnauthorizedError } from "../../../shared/errors/UnauthorizedError";
import { safeEqual } from "../../../shared/security/safeEqual";

export function requireCronSecret(request: Request, _response: Response, next: NextFunction): void {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    next(new AppError("El ciclo meteorologico programado no esta configurado.", 503));
    return;
  }

  // safeEqual compara hashes: un header con otro largo en bytes da 401, no una excepcion (500).
  if (!safeEqual(request.header("authorization"), `Bearer ${secret}`)) {
    next(new UnauthorizedError("La invocacion programada no esta autorizada."));
    return;
  }

  next();
}
