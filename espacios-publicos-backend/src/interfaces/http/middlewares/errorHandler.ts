import { NextFunction, Request, Response } from "express";
import { AppError } from "../../../shared/errors/AppError";

export function errorHandler(
  error: Error,
  _request: Request,
  response: Response,
  _next: NextFunction
): void {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }

  console.error(error);
  response.status(500).json({ message: "Error interno del servidor." });
}
