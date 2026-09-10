import { NextFunction, Request, Response } from "express";
import { ValidationError } from "../../../shared/errors/ValidationError";

export function allowBodyFields(allowedFields: readonly string[]) {
  const allowed = new Set(allowedFields);

  return (request: Request, _response: Response, next: NextFunction): void => {
    const body = request.body === undefined ? {} : request.body;

    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      next(new ValidationError("El cuerpo de la solicitud debe ser un objeto JSON."));
      return;
    }

    const unexpectedFields = Object.keys(body).filter((field) => !allowed.has(field));

    if (unexpectedFields.length > 0) {
      next(new ValidationError("La solicitud contiene campos no permitidos."));
      return;
    }

    next();
  };
}
