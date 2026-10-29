import { timingSafeEqual } from "crypto";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../../../shared/errors/AppError";
import { UnauthorizedError } from "../../../shared/errors/UnauthorizedError";

export function requireCronSecret(request: Request, _response: Response, next: NextFunction): void {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    next(new AppError("El ciclo meteorologico programado no esta configurado.", 503));
    return;
  }

  const received = request.header("authorization") || "";
  const expected = `Bearer ${secret}`;
  const valid =
    received.length === expected.length &&
    timingSafeEqual(Buffer.from(received), Buffer.from(expected));

  if (!valid) {
    next(new UnauthorizedError("La invocacion programada no esta autorizada."));
    return;
  }

  next();
}
