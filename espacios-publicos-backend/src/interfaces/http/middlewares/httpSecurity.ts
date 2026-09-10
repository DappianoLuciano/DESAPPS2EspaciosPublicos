import { CorsOptions } from "cors";
import { NextFunction, Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import { ForbiddenError } from "../../../shared/errors/ForbiddenError";
import {
  isProductionRuntime,
  isTestRuntime
} from "../../../shared/runtime/runtimeMode";

const developmentOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];

export function buildCorsOptions(): CorsOptions {
  const configuredOrigins = String(process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = new Set(
    isProductionRuntime()
      ? configuredOrigins
      : [...developmentOrigins, ...configuredOrigins]
  );

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new ForbiddenError("Origen no permitido por CORS."));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: isProductionRuntime()
      ? ["Content-Type", "Authorization"]
      : [
          "Content-Type",
          "Authorization",
          "x-user-id",
          "x-user-name",
          "x-user-email",
          "x-user-role"
        ],
    credentials: false,
    maxAge: 600
  };
}

export function requireHttps(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  if (isProductionRuntime() && !request.secure) {
    response.status(400).json({
      message: "HTTPS es obligatorio.",
      requestId: request.requestId
    });
    return;
  }

  next();
}

const commonRateLimitOptions = {
  standardHeaders: "draft-7" as const,
  legacyHeaders: false,
  skip: () => isTestRuntime()
};

function rateLimitHandler(message: string) {
  return (request: Request, response: Response): void => {
    response.status(429).json({ message, requestId: request.requestId });
  };
}

export const apiRateLimiter = rateLimit({
  ...commonRateLimitOptions,
  windowMs: 15 * 60 * 1000,
  limit: 200,
  handler: rateLimitHandler("Demasiadas solicitudes. Intenta nuevamente mas tarde.")
});

export const authRateLimiter = rateLimit({
  ...commonRateLimitOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  handler: rateLimitHandler("Demasiados intentos de acceso. Intenta nuevamente mas tarde.")
});

export const uploadRateLimiter = rateLimit({
  ...commonRateLimitOptions,
  windowMs: 60 * 60 * 1000,
  limit: 20,
  handler: rateLimitHandler("Se alcanzo el limite temporal de cargas.")
});
