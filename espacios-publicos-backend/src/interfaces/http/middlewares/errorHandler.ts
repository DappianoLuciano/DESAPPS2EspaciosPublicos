import { Prisma } from "@prisma/client";
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

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      response.status(409).json({
        message: "Ya existe un registro con ese correo electrónico."
      });
      return;
    }

    if (error.code === "P2021" || error.code === "P2022") {
      response.status(503).json({
        message:
          "La base de datos local no esta sincronizada con el modelo Prisma. Ejecuta npm run prisma:migrate y volve a intentar."
      });
      return;
    }

    if (error.code === "P2003") {
      response.status(409).json({
        message: "No se puede eliminar el registro porque tiene eventos o reservas asociadas."
      });
      return;
    }
  }

  console.error(error);
  response.status(500).json({ message: "Error interno del servidor." });
}
