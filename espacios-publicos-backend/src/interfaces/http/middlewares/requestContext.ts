import { randomUUID } from "node:crypto";
import { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestContext(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  request.requestId = randomUUID();
  response.setHeader("X-Request-ID", request.requestId);
  next();
}
