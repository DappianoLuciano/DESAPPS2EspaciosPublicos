import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { AppError } from "../../../shared/errors/AppError";
import { isProductionRuntime } from "../../../shared/runtime/runtimeMode";

function sendError(response: Response, statusCode: number, message: string, requestId: string): void {
  response.status(statusCode).json({ message, requestId });
}

export function errorHandler(
  error: Error,
  request: Request,
  response: Response,
  _next: NextFunction
): void {
  const httpError = error as Error & { type?: string; status?: number };

  if (httpError.type === "entity.parse.failed") {
    sendError(response, 400, "El cuerpo JSON de la solicitud no es valido.", request.requestId);
    return;
  }

  if (httpError.type === "entity.too.large") {
    sendError(response, 413, "El cuerpo de la solicitud es demasiado grande.", request.requestId);
    return;
  }

  if (error instanceof multer.MulterError) {
    const statusCode = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "La imagen supera el limite de 5 MB."
        : "La carga del archivo no es valida.";
    sendError(response, statusCode, message, request.requestId);
    return;
  }

  if (error instanceof AppError) {
    sendError(response, error.statusCode, error.message, request.requestId);
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      sendError(response, 409, "Ya existe un registro con ese correo electrónico.", request.requestId);
      return;
    }

    if (error.code === "P2021" || error.code === "P2022") {
      sendError(
        response,
        503,
        "La base de datos local no esta sincronizada con el modelo Prisma.",
        request.requestId
      );
      return;
    }

    if (error.code === "P2003") {
      sendError(
        response,
        409,
        "No se puede eliminar el registro porque tiene eventos o reservas asociadas.",
        request.requestId
      );
      return;
    }
  }

  if (isProductionRuntime()) {
    console.error("Unhandled request error", {
      requestId: request.requestId,
      method: request.method,
      path: request.path,
      errorName: error.name
    });
  } else {
    console.error(error);
  }

  sendError(response, 500, "Error interno del servidor.", request.requestId);
}
