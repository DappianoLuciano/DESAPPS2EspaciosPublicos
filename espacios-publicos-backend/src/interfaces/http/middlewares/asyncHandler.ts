import { NextFunction, Request, Response } from "express";

type AsyncController = (request: Request, response: Response, next: NextFunction) => Promise<void>;

// Express 4 no captura errores async automaticamente, por eso usamos este wrapper.
export function asyncHandler(controller: AsyncController) {
  return (request: Request, response: Response, next: NextFunction): void => {
    controller(request, response, next).catch(next);
  };
}
