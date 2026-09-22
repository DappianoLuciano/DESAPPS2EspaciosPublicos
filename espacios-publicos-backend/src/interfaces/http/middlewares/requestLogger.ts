import { NextFunction, Request, Response } from "express";
import { logger } from "../../../shared/logging/logger";

export function requestLogger(request: Request, response: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint();

  response.once("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    logger.info(
      {
        requestId: request.requestId,
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: Math.round(durationMs * 100) / 100
      },
      "request completed"
    );
  });

  next();
}
